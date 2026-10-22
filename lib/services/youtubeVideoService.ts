/**
 * Saves a YouTube video someone scheduled: checks the details against
 * YouTube's rules and that every file belongs to them, then queues it for
 * upload to YouTube.
 */

import { randomUUID } from 'crypto';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { UserRepository } from '@/lib/db/userRepository';
import { YouTubeVideoRepository } from '@/lib/db/youtubeVideoRepository';
import {
  CreateYouTubeVideoSchema,
  fieldErrors,
  MIN_SCHEDULE_LEAD_MINUTES,
  VideoDetailsSchema,
  type VideoDetails,
  type YouTubeVideoRecord,
} from '@/lib/models/youtubeVideo';
import { S3Client, type S3ClientConfig, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getConfig } from '@/lib/config';
import { getYouTubeAccess } from '@/lib/services/youtubeAccess';
import * as youtube from '@/lib/services/youtubeUploadApi';
import { planYouTubeUpdate } from '@/lib/youtube/sync';
import { s3FileSource } from '@/lib/services/youtubeUploadEngine';
import { isValidTimeZone, zonedToUtcSlot } from '@/lib/scheduling/time';

export const MAX_THUMBNAIL_SIZE = 2 * 1024 * 1024;
const THUMBNAIL_TYPES = ['image/jpeg', 'image/png'];

export class YouTubeVideoError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400,
    /** Field path → message, for showing next to the form fields */
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'YouTubeVideoError';
  }
}

/** The UTC instant a wall-clock date and time in `timeZone` falls on */
export function publishInstant(date: string, time: string, timeZone: string): Date {
  const slot = zonedToUtcSlot(date, time, timeZone);
  return new Date(`${slot.date}T${slot.time}:00.000Z`);
}

export class YouTubeVideoService {
  constructor(
    private videos = new YouTubeVideoRepository(),
    private media = new MediaRepository(),
    private users = new UserRepository(),
    private now: () => Date = () => new Date()
  ) {}

  async create(userId: string, body: unknown): Promise<YouTubeVideoRecord> {
    const parsed = CreateYouTubeVideoSchema.safeParse(body);
    if (!parsed.success) {
      const fields = fieldErrors(parsed.error);
      // Paths are relative to the details, which is what the form shows
      const detailFields = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.replace(/^details\./, ''), v]));
      throw new YouTubeVideoError('Some details need fixing', 'INVALID_DETAILS', 400, detailFields);
    }
    const { mediaId, details } = parsed.data;

    const user = await this.users.getUserById(userId);
    if (!user?.youtubeChannelId || !user.youtubeRefreshTokenEnc) {
      throw new YouTubeVideoError('Connect a YouTube channel first', 'NOT_CONNECTED', 409);
    }

    const video = await this.media.getMediaById(mediaId);
    if (!video || video.userId !== userId || video.mediaType !== 'video') {
      throw new YouTubeVideoError('Video not found', 'MEDIA_NOT_FOUND', 404);
    }
    if (video.status === 'uploading') {
      throw new YouTubeVideoError('Wait for the video to finish uploading', 'MEDIA_NOT_READY', 409);
    }

    await this.checkFiles(userId, details);
    const publishAt = this.publishTime(details);

    if (await this.videos.findByMedia(userId, mediaId)) {
      throw new YouTubeVideoError('This video is already scheduled', 'ALREADY_SCHEDULED', 409);
    }

    const isShort =
      !!video.width && !!video.height && !!video.durationSeconds && video.height >= video.width && video.durationSeconds <= 180;

    const timestamp = this.now().toISOString();
    return this.videos.create({
      videoId: randomUUID(),
      userId,
      mediaId,
      channelId: user.youtubeChannelId,
      status: 'queued',
      details,
      ...(publishAt ? { publishAt } : {}),
      isShort,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }


  /** The thumbnail and captions must be the user's own files */
  private async checkFiles(userId: string, details: VideoDetails): Promise<void> {
    if (details.thumbnailMediaId) {
      const thumb = await this.media.getMediaById(details.thumbnailMediaId);
      if (!thumb || thumb.userId !== userId) {
        throw new YouTubeVideoError('Thumbnail not found', 'INVALID_DETAILS', 400, { thumbnailMediaId: 'Upload the thumbnail again' });
      }
      if (!THUMBNAIL_TYPES.includes(thumb.contentType) || thumb.fileSize > MAX_THUMBNAIL_SIZE) {
        throw new YouTubeVideoError('Thumbnail must be a JPG or PNG up to 2 MB', 'INVALID_DETAILS', 400, {
          thumbnailMediaId: 'Thumbnails must be a JPG or PNG up to 2 MB',
        });
      }
    }
    // Caption files are stored under the user's own prefix by /api/youtube/captions
    if (details.captions && !details.captions.key.startsWith(`${userId}/captions/`)) {
      throw new YouTubeVideoError('Captions file not found', 'INVALID_DETAILS', 400, { captions: 'Upload the captions file again' });
    }
  }

  /** The UTC publish time for a scheduled video, at least a few minutes ahead */
  private publishTime(details: VideoDetails): string | undefined {
    if (details.publishMode !== 'schedule') return undefined;
    if (!isValidTimeZone(details.timeZone!)) {
      throw new YouTubeVideoError('Unknown time zone', 'INVALID_DETAILS', 400, { timeZone: 'Pick a time zone' });
    }
    const at = publishInstant(details.scheduledDate!, details.scheduledTime!, details.timeZone!);
    const earliest = this.now().getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000;
    if (Number.isNaN(at.getTime()) || at.getTime() < earliest) {
      throw new YouTubeVideoError('Pick a later time', 'INVALID_DETAILS', 400, {
        scheduledTime: `Pick a time at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes from now`,
      });
    }
    return at.toISOString();
  }

  /** Queues a failed video again, for the channel that's connected now */
  async retry(userId: string, videoId: string): Promise<YouTubeVideoRecord> {
    const record = await this.get(userId, videoId);
    if (record.status !== 'failed') {
      throw new YouTubeVideoError('Only failed videos can be retried', 'NOT_FAILED', 409);
    }
    const user = await this.users.getUserById(userId);
    if (!user?.youtubeChannelId || !user.youtubeRefreshTokenEnc) {
      throw new YouTubeVideoError('Connect a YouTube channel first', 'NOT_CONNECTED', 409);
    }
    // A different channel means a fresh upload; the old session belonged to the old one
    const sameChannel = user.youtubeChannelId === record.channelId;
    const changed = await this.videos.update(
      videoId,
      { status: 'queued', attempts: 0, channelId: user.youtubeChannelId },
      {
        remove: ['error', 'nextAttemptAt', 'heartbeatAt', ...(sameChannel ? [] : (['uploadSessionUri', 'youtubeVideoId', 'uploadedBytes'] as const))],
        onlyIfStatus: 'failed',
      }
    );
    if (!changed) throw new YouTubeVideoError('This video changed; refresh and try again', 'CONFLICT', 409);
    return this.get(userId, videoId);
  }

  async list(userId: string): Promise<YouTubeVideoRecord[]> {
    return this.videos.listByUser(userId);
  }


  /**
   * Saves edited details. Before upload they're just stored; once the video is
   * on YouTube the changes are sent there too (only the fields that changed,
   * so edits made in YouTube Studio are kept). Returns warnings for extras
   * (thumbnail, playlists, captions) that didn't go through.
   */
  async update(userId: string, videoId: string, body: unknown): Promise<{ video: YouTubeVideoRecord; warnings: string[] }> {
    const record = await this.get(userId, videoId);
    if (record.status === 'uploading') {
      throw new YouTubeVideoError('The video is uploading to YouTube right now. Try again in a minute.', 'UPLOADING', 409);
    }
    const parsed = VideoDetailsSchema.safeParse((body as { details?: unknown })?.details);
    if (!parsed.success) throw new YouTubeVideoError('Some details need fixing', 'INVALID_DETAILS', 400, fieldErrors(parsed.error));
    const details = parsed.data;
    await this.checkFiles(userId, details);

    const live = record.status === 'published';
    const sameTime =
      details.publishMode === 'schedule' &&
      record.details.publishMode === 'schedule' &&
      details.scheduledDate === record.details.scheduledDate &&
      details.scheduledTime === record.details.scheduledTime &&
      details.timeZone === record.details.timeZone;
    // A published video's time has passed, and an unchanged time keeps its slot even if it's soon
    const publishAt = live ? record.publishAt : sameTime ? record.publishAt : this.publishTime(details);
    const warnings: string[] = [];

    if (record.youtubeVideoId) {
      const { accessToken, channelId } = await getYouTubeAccess(userId);
      if (channelId !== record.channelId) {
        throw new YouTubeVideoError('A different YouTube channel is connected now, so this video can’t be edited from Zetca.', 'CHANNEL_CHANGED', 409);
      }
      const current = await youtube.getVideoResource(accessToken, record.youtubeVideoId);
      if (!current) throw new YouTubeVideoError('This video was deleted on YouTube.', 'GONE_ON_YOUTUBE', 410);

      const plan = planYouTubeUpdate(current, record.details, details, {
        scheduled: record.status === 'scheduled',
        publishAtBefore: record.publishAt,
        publishAtAfter: live ? undefined : publishAt,
      });
      if (plan.parts.length) await youtube.updateVideo(accessToken, plan.resource, plan.parts);

      const files = s3FileSource();
      const attempt = async (what: string, fn: () => Promise<void>) => {
        try {
          await fn();
        } catch (error) {
          warnings.push(`${what}: ${(error as Error).message}`);
        }
      };
      if (details.thumbnailMediaId && details.thumbnailMediaId !== record.details.thumbnailMediaId && !record.isShort) {
        await attempt('Thumbnail', async () => {
          const thumb = await this.media.getMediaById(details.thumbnailMediaId!);
          await youtube.setThumbnail(accessToken, record.youtubeVideoId!, await files.readAll(thumb!.s3Key), thumb!.contentType);
        });
      }
      for (const id of details.playlistIds.filter((p) => !record.details.playlistIds.includes(p))) {
        await attempt('Playlist', () => youtube.addToPlaylist(accessToken, id, record.youtubeVideoId!));
      }
      for (const id of record.details.playlistIds.filter((p) => !details.playlistIds.includes(p))) {
        await attempt('Playlist', () => youtube.removeFromPlaylist(accessToken, id, record.youtubeVideoId!));
      }
      if (details.captions && details.captions.key !== record.details.captions?.key) {
        await attempt('Captions', async () =>
          youtube.insertCaptions(accessToken, record.youtubeVideoId!, details.captions!.language, await files.readAll(details.captions!.key))
        );
      }
    }

    // Publishing a scheduled video now makes it published
    const status = record.status === 'scheduled' && !publishAt ? 'published' : record.status;
    await this.videos.update(
      videoId,
      { details, status, ...(publishAt ? { publishAt } : {}) },
      { remove: publishAt ? [] : ['publishAt'] }
    );
    return { video: await this.get(userId, videoId), warnings };
  }

  /**
   * Removes a video from Zetca: its record and the files Zetca stored. A video
   * that hasn't gone up is cancelled; one already on YouTube stays there.
   */
  async remove(userId: string, videoId: string): Promise<{ onYouTube: boolean }> {
    const record = await this.get(userId, videoId);
    if (record.status === 'uploading') {
      throw new YouTubeVideoError('The video is uploading to YouTube right now. Try again in a minute.', 'UPLOADING', 409);
    }
    const cfg = getConfig();
    const s3Config: S3ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    const s3 = new S3Client(s3Config);
    const drop = (key?: string) => (key ? s3.send(new DeleteObjectCommand({ Bucket: cfg.s3MediaBucket, Key: key })).catch(() => {}) : null);

    // Delete the record first so the upload worker can't pick it up mid-way
    await this.videos.delete(videoId);
    for (const mediaId of [record.mediaId, record.details.thumbnailMediaId]) {
      if (!mediaId) continue;
      const media = await this.media.getMediaById(mediaId);
      if (!media || media.userId !== userId) continue;
      await Promise.all([drop(media.s3Key), drop(media.transcript?.key)]);
      await this.media.deleteMedia(mediaId);
    }
    await drop(record.details.captions?.key);
    return { onYouTube: !!record.youtubeVideoId };
  }

  async get(userId: string, videoId: string): Promise<YouTubeVideoRecord> {
    const record = await this.videos.getById(videoId);
    if (!record || record.userId !== userId) throw new YouTubeVideoError('Video not found', 'NOT_FOUND', 404);
    return record;
  }
}
