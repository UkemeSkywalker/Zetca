/**
 * Publisher service orchestrating the LinkedIn publishing workflow.
 *
 * Coordinates scanning for due posts, retrieving user credentials,
 * downloading media from S3, calling the LinkedIn API, updating post
 * statuses, and logging all publish attempts.
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PublishLogRecord, LinkedInPostResponse, newPublishLogRecord } from '../models/publisher';
import { ScheduledPostRecord } from '../models/scheduler';
import { LinkedInClient } from './linkedinClient';
import { PublisherRepository } from '../db/publisherRepository';
import { SchedulerRepository } from '../db/schedulerRepository';
import { UserRepository } from '../db/userRepository';
import { MediaRepository } from '../db/mediaRepository';
import { getConfig } from '../config';

export interface LinkedInCredentials {
  linkedinAccessToken?: string;
  linkedinSub?: string;
  linkedinName?: string;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class PublisherService {
  private s3Client: S3Client;
  private s3Bucket: string;

  constructor(
    private linkedinClient: LinkedInClient,
    private publisherRepository: PublisherRepository,
    private schedulerRepository: SchedulerRepository,
    private userRepository: UserRepository,
    private mediaRepository: MediaRepository,
    s3Bucket?: string
  ) {
    const cfg = getConfig();
    this.s3Bucket = s3Bucket || cfg.s3MediaBucket;
    const clientConfig: Record<string, any> = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.s3Client = new S3Client(clientConfig);
  }

  /**
   * Query scheduled-posts for posts where status="scheduled",
   * platform="linkedin", and scheduledDate+scheduledTime <= now (UTC).
   * The frontend stores times in UTC already.
   */
  async getDuePosts(): Promise<ScheduledPostRecord[]> {
    const now = Date.now();
    const allPosts = await this.schedulerRepository.scanAll();

    const duePosts: ScheduledPostRecord[] = [];
    for (const post of allPosts) {
      if (post.status !== 'scheduled') continue;
      if (post.platform !== 'linkedin') continue;
      const postDt = new Date(`${post.scheduled_date}T${post.scheduled_time}:00Z`);
      if (Number.isNaN(postDt.getTime())) {
        console.warn(`Invalid date/time for post ${post.id}`);
        continue;
      }
      if (postDt.getTime() <= now) duePosts.push(post);
    }

    console.info(`Found ${duePosts.length} due posts out of ${allPosts.length} total`);
    return duePosts;
  }

  /**
   * Publish a single post to LinkedIn.
   * On success, marks the post "published" and creates a success log.
   * On failure, creates a failure log and leaves the post status unchanged.
   */
  async publishPost(post: ScheduledPostRecord, credentials: LinkedInCredentials): Promise<PublishLogRecord> {
    const accessToken = credentials.linkedinAccessToken!;
    const personUrn = `urn:li:person:${credentials.linkedinSub}`;
    const commentary = this.linkedinClient.formatCommentary(post.content, post.hashtags);

    let response: LinkedInPostResponse | null;
    if (post.media_id) {
      response = await this.handleImagePost(post, accessToken, personUrn, commentary);
      if (response === null) {
        return this.createFailureLog(post, 's3_download_error', 'Failed to download image from S3');
      }
    } else {
      response = await this.linkedinClient.createTextPost(accessToken, personUrn, commentary);
    }

    if (response.status_code === 201) {
      await this.schedulerRepository.updatePost(post.id, { status: 'published' });
      const logRecord = newPublishLogRecord({
        post_id: post.id,
        user_id: post.user_id,
        platform: 'linkedin',
        status: 'published',
        linkedin_post_id: response.post_id,
      });
      await this.publisherRepository.createLog(logRecord);
      console.info(`Published post ${post.id} to LinkedIn (post_id=${response.post_id})`);
      return logRecord;
    }

    return this.createFailureLog(post, response.error_code ?? 'unknown_error', response.error_message ?? '');
  }

  /**
   * Handle the image post flow: retrieve media record, download from S3,
   * upload to LinkedIn, create image post. Returns null only on S3
   * download failure. Falls back to text-only if the media record is
   * missing.
   */
  private async handleImagePost(
    post: ScheduledPostRecord,
    accessToken: string,
    personUrn: string,
    commentary: string
  ): Promise<LinkedInPostResponse | null> {
    const mediaRecord = await this.mediaRepository.getMediaById(post.media_id!);
    if (mediaRecord === null) {
      console.warn(`Media record not found for mediaId=${post.media_id} on post ${post.id}. Publishing as text-only.`);
      return this.linkedinClient.createTextPost(accessToken, personUrn, commentary);
    }

    const s3Key = mediaRecord.s3Key;
    const contentType = mediaRecord.contentType || 'image/jpeg';

    const imageData = await this.downloadFromS3(s3Key);
    if (imageData === null) {
      console.error(`S3 download failed for s3Key=${s3Key} on post ${post.id}. Skipping post.`);
      return null;
    }

    let uploadResponse;
    try {
      uploadResponse = await this.linkedinClient.initializeImageUpload(accessToken, personUrn);
    } catch (e: any) {
      console.error(`Image upload init failed for post ${post.id}: ${e?.message ?? e}`);
      return { status_code: 0, error_code: 'image_upload_init_error', error_message: String(e?.message ?? e).slice(0, 500) };
    }

    try {
      await this.linkedinClient.uploadImageBinary(uploadResponse.upload_url, imageData, contentType);
    } catch (e: any) {
      console.error(`Image binary upload failed for post ${post.id}: ${e?.message ?? e}`);
      return { status_code: 0, error_code: 'image_upload_error', error_message: String(e?.message ?? e).slice(0, 500) };
    }

    return this.linkedinClient.createImagePost(accessToken, personUrn, commentary, uploadResponse.image_urn);
  }

  /**
   * Execute one full scan cycle: query due posts, group by user, process
   * sequentially per user, skipping posts already in flight.
   */
  async runScanCycle(processingPostIds: Set<string>): Promise<void> {
    const duePosts = await this.getDuePosts();
    if (!duePosts.length) return;

    const postsToProcess = duePosts.filter((p) => !processingPostIds.has(p.id));
    if (!postsToProcess.length) {
      console.debug('All due posts are already being processed');
      return;
    }

    const cyclePostIds = new Set(postsToProcess.map((p) => p.id));
    cyclePostIds.forEach((id) => processingPostIds.add(id));

    const postsByUser = new Map<string, ScheduledPostRecord[]>();
    for (const post of postsToProcess) {
      const list = postsByUser.get(post.user_id) ?? [];
      list.push(post);
      postsByUser.set(post.user_id, list);
    }

    try {
      for (const [userId, userPosts] of postsByUser) {
        await this.processUserPosts(userId, userPosts);
      }
    } finally {
      cyclePostIds.forEach((id) => processingPostIds.delete(id));
    }
  }

  /** Process all due posts for a single user sequentially. */
  private async processUserPosts(userId: string, posts: ScheduledPostRecord[]): Promise<void> {
    const credentials = await this.userRepository.getUserLinkedInCredentials(userId);

    if (credentials === null) {
      console.warn(`User ${userId} not found. Skipping all posts.`);
      for (const post of posts) await this.createSkippedLog(post, 'linkedin_not_connected', 'User not found');
      return;
    }

    if (!credentials.linkedinAccessToken) {
      console.warn(`User ${userId} has no LinkedIn access token. Skipping.`);
      for (const post of posts) {
        await this.createSkippedLog(post, 'linkedin_not_connected', 'LinkedIn account not connected');
      }
      return;
    }

    if (!credentials.linkedinSub) {
      console.warn(`User ${userId} has no linkedinSub. Skipping.`);
      for (const post of posts) {
        await this.createSkippedLog(post, 'linkedin_sub_missing', 'LinkedIn person URN (linkedinSub) is missing');
      }
      return;
    }

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      try {
        const logRecord = await this.publishPost(post, credentials);
        if (logRecord.status === 'failed' && logRecord.error_code === 'rate_limited') {
          console.warn(`Rate limited for user ${userId}. Skipping remaining ${posts.length - i - 1} posts.`);
          break;
        }
      } catch (e: any) {
        console.error(`Unexpected error publishing post ${post.id}: ${e?.message ?? e}`);
        await this.createFailureLog(post, 'internal_error', String(e?.message ?? e).slice(0, 500));
      }
    }
  }

  private async downloadFromS3(s3Key: string): Promise<Buffer | null> {
    try {
      const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.s3Bucket, Key: s3Key }));
      return streamToBuffer(response.Body);
    } catch (e: any) {
      console.error(`S3 download failed for key=${s3Key}: ${e?.message ?? e}`);
      return null;
    }
  }

  private async createFailureLog(post: ScheduledPostRecord, errorCode: string, errorMessage: string): Promise<PublishLogRecord> {
    const logRecord = newPublishLogRecord({
      post_id: post.id,
      user_id: post.user_id,
      platform: 'linkedin',
      status: 'failed',
      error_code: errorCode,
      error_message: errorMessage,
    });
    await this.publisherRepository.createLog(logRecord);
    console.warn(`Publish failed for post ${post.id}: ${errorCode} - ${errorMessage}`);
    return logRecord;
  }

  private async createSkippedLog(post: ScheduledPostRecord, errorCode: string, errorMessage: string): Promise<PublishLogRecord> {
    const logRecord = newPublishLogRecord({
      post_id: post.id,
      user_id: post.user_id,
      platform: 'linkedin',
      status: 'skipped',
      error_code: errorCode,
      error_message: errorMessage,
    });
    await this.publisherRepository.createLog(logRecord);
    console.info(`Skipped post ${post.id}: ${errorCode} - ${errorMessage}`);
    return logRecord;
  }
}
