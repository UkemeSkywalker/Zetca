/**
 * Publisher service orchestrating the LinkedIn publishing workflow.
 *
 * Each scan finds due posts, then for each one:
 *   1. claims it (scheduled -> publishing, a conditional write), so no other
 *      server or manual publish can post it too;
 *   2. posts it to LinkedIn;
 *   3. logs the attempt, then marks it published, reschedules a retry with a
 *      growing delay, or marks it failed (permanent errors, or too many tries).
 * Posts left in "publishing" by a server that stopped mid-publish are settled
 * from the publish log rather than posted again.
 */

import { S3Client, GetObjectCommand, type S3ClientConfig } from '@aws-sdk/client-s3';
import { PublishLogRecord, LinkedInPostResponse, newPublishLogRecord, PublishStatus } from '../models/publisher';
import { AUTO_PUBLISH_PLATFORMS, PostStatus, ScheduledPostRecord } from '../models/scheduler';
import { LinkedInClient } from './linkedinClient';
import { PublisherRepository } from '../db/publisherRepository';
import { SchedulerRepository } from '../db/schedulerRepository';
import { UserRepository } from '../db/userRepository';
import { MediaRepository } from '../db/mediaRepository';
import { pagesToPdf, slidesToPages } from '../media/slidesPdf';
import { getConfig } from '../config';
import { ApiError } from '../errors';

export interface LinkedInCredentials {
  linkedinAccessToken?: string;
  linkedinSub?: string;
  linkedinName?: string;
}

/** Automatic attempts before a post is marked failed */
export const MAX_PUBLISH_ATTEMPTS = 5;
/** A post still "publishing" after this long was abandoned by its publisher */
export const STUCK_PUBLISHING_MS = 10 * 60_000;
/** Users whose posts are published at the same time (each user's posts go one by one) */
const USER_CONCURRENCY = 5;

/** Errors that won't fix themselves, so retrying is pointless */
const PERMANENT_ERRORS = new Set([
  'token_expired',
  'access_denied',
  'validation_error',
  'linkedin_not_connected',
  'linkedin_sub_missing',
  'media_forbidden',
  'platform_not_supported',
  'document_processing_failed',
]);

/** What the user sees on a failed post */
const ERROR_MESSAGES: Record<string, string> = {
  token_expired: 'Your LinkedIn sign-in has expired. Reconnect LinkedIn in your profile, then reschedule this post.',
  access_denied: "LinkedIn refused this post (permission denied). Reconnect LinkedIn, then reschedule it.",
  validation_error: 'LinkedIn rejected this post. Check its text and image, then reschedule it.',
  linkedin_not_connected: 'LinkedIn isn’t connected. Connect it in your profile, then reschedule this post.',
  linkedin_sub_missing: 'Your LinkedIn profile details are incomplete. Reconnect LinkedIn, then reschedule this post.',
  media_forbidden: 'The attached image isn’t yours, so it can’t be posted.',
  document_processing_failed: 'LinkedIn couldn’t read the carousel. Open it in the Designer, update the post, then reschedule it.',
  platform_not_supported: 'Automatic publishing isn’t available for this platform yet. Post it yourself, then mark it as published.',
  publish_interrupted:
    'Publishing was interrupted, so we couldn’t confirm whether it posted. Check LinkedIn before rescheduling.',
};

function friendlyError(code: string, detail: string, attempts: number): string {
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  return `Couldn’t publish after ${attempts} ${attempts === 1 ? 'try' : 'tries'} (${code}${detail ? `: ${detail.slice(0, 160)}` : ''}).`;
}

/** Wait before automatic attempt n+1: 1, 2, 4, 8 minutes... capped at an hour */
/** The title LinkedIn shows above a carousel: the post's first line, kept short */
export function carouselTitle(content: string): string {
  const first = content.split('\n').map((l) => l.trim()).find(Boolean) ?? 'Carousel';
  const plain = first.replace(/#\S+/g, '').replace(/\s+/g, ' ').trim() || 'Carousel';
  return plain.length > 100 ? `${plain.slice(0, 97).trimEnd()}…` : plain;
}

export function retryDelayMs(attempts: number): number {
  return Math.min(60, 2 ** Math.max(0, attempts - 1)) * 60_000;
}

async function streamToBuffer(stream: AsyncIterable<Uint8Array>): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/** Run `fn` over `items`, at most `limit` at a time */
async function inPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await fn(items[next++]);
  });
  await Promise.all(workers);
}

async function withRetries<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i >= attempts) throw error;
      console.warn(`${label} failed (try ${i}), retrying: ${(error as Error)?.message ?? error}`);
      await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** i));
    }
  }
}

export class PublisherService {
  private s3Client: S3Client;
  private s3Bucket: string;
  /** How long to wait between checks that LinkedIn has finished reading a carousel PDF */
  documentPollMs = 5000;

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
    const clientConfig: S3ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      clientConfig.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.s3Client = new S3Client(clientConfig);
  }

  /** Scheduled posts whose time has come (and whose retry delay, if any, has passed) */
  async getDuePosts(): Promise<ScheduledPostRecord[]> {
    const now = new Date().toISOString();
    const due = (await this.schedulerRepository.findDuePosts(now)).filter(
      (p) => !p.next_attempt_at || p.next_attempt_at <= now
    );
    if (due.length) console.info(`Found ${due.length} due posts`);
    return due;
  }

  /**
   * One scan: settle abandoned posts, then publish due posts, a few users at a
   * time and each user's posts in order.
   */
  async runScanCycle(): Promise<void> {
    await this.settleStuckPosts();
    const duePosts = await this.getDuePosts();
    if (!duePosts.length) return;

    const postsByUser = new Map<string, ScheduledPostRecord[]>();
    for (const post of duePosts) postsByUser.set(post.user_id, [...(postsByUser.get(post.user_id) ?? []), post]);

    await inPool([...postsByUser], USER_CONCURRENCY, async ([userId, posts]) => {
      try {
        await this.processUserPosts(userId, posts);
      } catch (e) {
        console.error(`Publishing for user ${userId} failed: ${(e as Error)?.message ?? e}`);
      }
    });
  }

  /** Process one user's due posts in order. */
  private async processUserPosts(userId: string, posts: ScheduledPostRecord[]): Promise<void> {
    // Platforms we can't post to yet are marked once, not retried every scan
    for (const post of posts.filter((p) => !AUTO_PUBLISH_PLATFORMS.has(p.platform))) {
      await this.failWithoutAttempt(post, 'platform_not_supported', 'skipped');
    }
    const linkedinPosts = posts.filter((p) => AUTO_PUBLISH_PLATFORMS.has(p.platform));
    if (!linkedinPosts.length) return;

    // Each post goes out as its own LinkedIn account (or the default one)
    const byAccount = new Map<string, Awaited<ReturnType<typeof this.userRepository.getUserLinkedInCredentials>>>();
    const credentialsFor = async (accountId?: string | null) => {
      const key = accountId ?? '';
      if (!byAccount.has(key)) byAccount.set(key, await this.userRepository.getUserLinkedInCredentials(userId, accountId));
      return byAccount.get(key);
    };

    for (const post of linkedinPosts) {
      const credentials = await credentialsFor(post.account_id);
      const missing = !credentials?.linkedinAccessToken
        ? 'linkedin_not_connected'
        : !credentials.linkedinSub
          ? 'linkedin_sub_missing'
          : null;
      if (missing) {
        await this.failWithoutAttempt(post, missing, 'skipped');
        continue;
      }
      const claimed = await this.schedulerRepository.claimPost(post.id);
      if (!claimed) continue; // another publisher has it, or it changed since the scan
      const log = await this.attempt(claimed, credentials!, { onFailureStatus: 'scheduled' });
      if (log.status === 'failed' && log.error_code === 'rate_limited') {
        console.warn(`Rate limited for user ${userId}; leaving their remaining posts for a later scan.`);
        break;
      }
    }
  }

  /**
   * Publish a post the user asked to publish now. Claims it first, so it can't
   * also be posted by the scanner. On failure the post keeps its previous status.
   */
  async publishNow(postId: string, userId: string): Promise<PublishLogRecord> {
    const post = await this.schedulerRepository.getPostById(postId);
    if (post === null) throw new ApiError('Post not found', 404);
    if (post.user_id !== userId) throw new ApiError('Access denied: You do not have permission to publish this post', 403);
    if (!AUTO_PUBLISH_PLATFORMS.has(post.platform)) throw new ApiError('Only LinkedIn publishing is currently supported', 400);
    if (post.status === 'published') throw new ApiError('Post is already published', 400);
    if (post.status === 'publishing') throw new ApiError('This post is being published right now', 409);

    const credentials = await this.userRepository.getUserLinkedInCredentials(userId, post.account_id);
    if (!credentials?.linkedinAccessToken) {
      throw new ApiError('LinkedIn account not connected. Please connect your LinkedIn account first.', 400);
    }
    if (!credentials.linkedinSub) {
      throw new ApiError('LinkedIn profile information is incomplete. Please reconnect your LinkedIn account.', 400);
    }

    const claimed = await this.schedulerRepository.claimPost(postId, { manual: true });
    if (!claimed) throw new ApiError('This post is being published right now', 409);
    return this.attempt(claimed, credentials, { onFailureStatus: post.status, manual: true });
  }

  /**
   * One attempt at a claimed post. The log is written before the status, so a
   * post whose status update fails can still be settled from the log later.
   */
  private async attempt(
    post: ScheduledPostRecord,
    credentials: LinkedInCredentials,
    { onFailureStatus, manual = false }: { onFailureStatus: PostStatus; manual?: boolean }
  ): Promise<PublishLogRecord> {
    let response: LinkedInPostResponse;
    try {
      response = await this.sendToLinkedIn(post, credentials);
    } catch (e) {
      response = { status_code: 0, error_code: 'internal_error', error_message: String((e as Error)?.message ?? e).slice(0, 500) };
    }

    if (response.status_code === 201) {
      const log = await this.writeLog(post, 'published', { linkedin_post_id: response.post_id });
      const now = new Date().toISOString();
      await withRetries(`Marking post ${post.id} published`, () =>
        this.schedulerRepository.updatePost(
          post.id,
          { status: 'published', published_at: now, claimed_at: null, next_attempt_at: null, last_error_code: null, last_error: null },
          { expectedStatus: 'publishing' }
        )
      ).catch((e) => console.error(`Post ${post.id} was published but its status couldn't be saved: ${e?.message ?? e}`));
      console.info(`Published post ${post.id} to LinkedIn (post_id=${response.post_id})`);
      return log;
    }

    const code = response.error_code ?? 'unknown_error';
    const detail = response.error_message ?? '';
    const log = await this.writeLog(post, 'failed', { error_code: code, error_message: detail });
    const attempts = post.publish_attempts ?? 1;
    const giveUp = !manual && (PERMANENT_ERRORS.has(code) || attempts >= MAX_PUBLISH_ATTEMPTS);

    const updates = giveUp
      ? { status: 'failed' as const, next_attempt_at: null }
      : manual
        ? { status: onFailureStatus, next_attempt_at: null }
        : { status: onFailureStatus, next_attempt_at: new Date(Date.now() + retryDelayMs(attempts)).toISOString() };
    await withRetries(`Recording failure for post ${post.id}`, () =>
      this.schedulerRepository.updatePost(
        post.id,
        { ...updates, claimed_at: null, last_error_code: code, last_error: friendlyError(code, detail, attempts) },
        { expectedStatus: 'publishing' }
      )
    ).catch((e) => console.error(`Couldn't record the failure for post ${post.id}: ${e?.message ?? e}`));
    console.warn(`Publish failed for post ${post.id} (attempt ${attempts}): ${code} - ${detail}${giveUp ? ' — giving up' : ''}`);
    return log;
  }

  /** Post to LinkedIn, with the image if there is one */
  private async sendToLinkedIn(post: ScheduledPostRecord, credentials: LinkedInCredentials): Promise<LinkedInPostResponse> {
    const accessToken = credentials.linkedinAccessToken!;
    const personUrn = `urn:li:person:${credentials.linkedinSub}`;
    const commentary = this.linkedinClient.formatCommentary(post.content, post.hashtags);
    if ((post.media_ids?.length ?? 0) > 1) return this.sendCarousel(post, accessToken, personUrn, commentary);
    if (!post.media_id) return this.linkedinClient.createTextPost(accessToken, personUrn, commentary);

    const media = await this.mediaRepository.getMediaById(post.media_id);
    if (media === null) {
      console.warn(`Media ${post.media_id} on post ${post.id} not found. Publishing as text only.`);
      return this.linkedinClient.createTextPost(accessToken, personUrn, commentary);
    }
    if (media.userId !== post.user_id) {
      return { status_code: 0, error_code: 'media_forbidden', error_message: 'Media belongs to another user' };
    }

    const imageData = await this.downloadFromS3(media.s3Key);
    if (imageData === null) {
      return { status_code: 0, error_code: 's3_download_error', error_message: 'Failed to download image from S3' };
    }

    let upload;
    try {
      upload = await this.linkedinClient.initializeImageUpload(accessToken, personUrn);
    } catch (e) {
      return { status_code: 0, error_code: 'image_upload_init_error', error_message: String((e as Error)?.message ?? e).slice(0, 500) };
    }
    try {
      await this.linkedinClient.uploadImageBinary(upload.upload_url, imageData, media.contentType || 'image/jpeg');
    } catch (e) {
      return { status_code: 0, error_code: 'image_upload_error', error_message: String((e as Error)?.message ?? e).slice(0, 500) };
    }
    return this.linkedinClient.createImagePost(accessToken, personUrn, commentary, upload.image_urn);
  }

  /**
   * A carousel: every slide as one PDF, which LinkedIn shows as a swipeable
   * document post. If LinkedIn won't take documents from this app, the
   * slides go out as a multi-image post instead.
   */
  private async sendCarousel(post: ScheduledPostRecord, accessToken: string, personUrn: string, commentary: string): Promise<LinkedInPostResponse> {
    const ids = post.media_ids!.slice(0, 20);
    const images: { data: Buffer; contentType: string }[] = [];
    for (const id of ids) {
      const media = await this.mediaRepository.getMediaById(id);
      if (media === null) return { status_code: 0, error_code: 's3_download_error', error_message: `Slide ${images.length + 1} of the carousel is missing` };
      if (media.userId !== post.user_id) return { status_code: 0, error_code: 'media_forbidden', error_message: 'Media belongs to another user' };
      const data = await this.downloadFromS3(media.s3Key);
      if (data === null) return { status_code: 0, error_code: 's3_download_error', error_message: `Failed to download slide ${images.length + 1} from S3` };
      images.push({ data, contentType: media.contentType || 'image/jpeg' });
    }

    let doc: { upload_url: string; document_urn: string };
    try {
      doc = await this.linkedinClient.initializeDocumentUpload(accessToken, personUrn);
    } catch (e) {
      const status = (e as { status?: number }).status;
      // Documents not allowed for this app (or this member): post the slides as images instead
      if (status === 403 || status === 422) return this.sendMultiImage(images, accessToken, personUrn, commentary);
      return { status_code: status ?? 0, error_code: status === 401 ? 'token_expired' : 'document_upload_init_error', error_message: String((e as Error)?.message ?? e).slice(0, 500) };
    }
    try {
      const pdf = pagesToPdf(await slidesToPages(images.map((i) => i.data)));
      await this.linkedinClient.uploadDocument(accessToken, doc.upload_url, pdf);
    } catch (e) {
      return { status_code: 0, error_code: 'document_upload_error', error_message: String((e as Error)?.message ?? e).slice(0, 500) };
    }
    // LinkedIn turns the PDF into pages first; wait for it (up to about a minute)
    for (let i = 0; i < 12; i++) {
      const status = await this.linkedinClient.documentStatus(accessToken, doc.document_urn).catch(() => 'UNKNOWN');
      if (status === 'AVAILABLE') break;
      if (status === 'PROCESSING_FAILED') return { status_code: 0, error_code: 'document_processing_failed', error_message: 'LinkedIn couldn’t read the carousel PDF' };
      await new Promise((r) => setTimeout(r, this.documentPollMs));
    }
    return this.linkedinClient.createDocumentPost(accessToken, personUrn, commentary, doc.document_urn, carouselTitle(post.content));
  }

  /** The slides as a grid of images (LinkedIn allows 2-20) */
  private async sendMultiImage(images: { data: Buffer; contentType: string }[], accessToken: string, personUrn: string, commentary: string): Promise<LinkedInPostResponse> {
    const urns: string[] = [];
    try {
      for (const img of images) {
        const upload = await this.linkedinClient.initializeImageUpload(accessToken, personUrn);
        await this.linkedinClient.uploadImageBinary(upload.upload_url, img.data, img.contentType);
        urns.push(upload.image_urn);
      }
    } catch (e) {
      return { status_code: 0, error_code: 'image_upload_error', error_message: String((e as Error)?.message ?? e).slice(0, 500) };
    }
    return this.linkedinClient.createMultiImagePost(accessToken, personUrn, commentary, urns, urns.map((_, i) => `Slide ${i + 1} of ${urns.length}`));
  }

  /** Mark a due post failed without calling LinkedIn (unsupported platform, LinkedIn not connected) */
  private async failWithoutAttempt(post: ScheduledPostRecord, code: string, logStatus: PublishStatus): Promise<void> {
    const updated = await this.schedulerRepository.updatePost(
      post.id,
      { status: 'failed', last_error_code: code, last_error: ERROR_MESSAGES[code] ?? code, next_attempt_at: null },
      { expectedStatus: 'scheduled' }
    );
    if (!updated) return; // changed since the scan; leave it
    await this.writeLog(post, logStatus, { error_code: code, error_message: ERROR_MESSAGES[code] ?? code });
    console.info(`Post ${post.id} not published: ${code}`);
  }

  /**
   * Posts left "publishing" by a publisher that stopped: if the log shows they
   * were published, mark them so; otherwise mark them failed for the user to
   * check, rather than risk posting them twice.
   */
  async settleStuckPosts(): Promise<void> {
    const before = new Date(Date.now() - STUCK_PUBLISHING_MS).toISOString();
    const stuck = await this.schedulerRepository.findStuckPublishing(before);
    for (const post of stuck) {
      const logs = await this.publisherRepository.listLogsByPost(post.id);
      const published = logs.find((l) => l.status === 'published' && (!post.claimed_at || l.attempted_at >= post.claimed_at));
      await this.schedulerRepository.updatePost(
        post.id,
        published
          ? { status: 'published', published_at: published.attempted_at, claimed_at: null, last_error_code: null, last_error: null }
          : { status: 'failed', claimed_at: null, last_error_code: 'publish_interrupted', last_error: ERROR_MESSAGES.publish_interrupted },
        { expectedStatus: 'publishing' }
      );
      console.warn(`Settled stuck post ${post.id} as ${published ? 'published' : 'failed'}`);
    }
  }

  /** Give old scheduled posts a dueAt so the due-posts index can find them */
  async backfillDueAt(): Promise<number> {
    const missing = await this.schedulerRepository.findScheduledWithoutDueAt();
    for (const post of missing) {
      await this.schedulerRepository.updatePost(post.id, { due_at: `${post.scheduled_date}T${post.scheduled_time}:00.000Z` });
    }
    if (missing.length) console.info(`Backfilled dueAt on ${missing.length} scheduled posts`);
    return missing.length;
  }

  private async downloadFromS3(s3Key: string): Promise<Buffer | null> {
    try {
      const response = await this.s3Client.send(new GetObjectCommand({ Bucket: this.s3Bucket, Key: s3Key }));
      return streamToBuffer(response.Body as AsyncIterable<Uint8Array>);
    } catch (e) {
      console.error(`S3 download failed for key=${s3Key}: ${(e as Error)?.message ?? e}`);
      return null;
    }
  }

  private async writeLog(
    post: ScheduledPostRecord,
    status: PublishStatus,
    extra: Partial<PublishLogRecord>
  ): Promise<PublishLogRecord> {
    const log = newPublishLogRecord({ post_id: post.id, user_id: post.user_id, platform: post.platform, status, ...extra });
    await withRetries(`Writing publish log for ${post.id}`, () => this.publisherRepository.createLog(log)).catch((e) =>
      console.error(`Couldn't write the publish log for post ${post.id}: ${e?.message ?? e}`)
    );
    return log;
  }
}
