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
  type YouTubeVideoRecord,
} from '@/lib/models/youtubeVideo';
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

    let publishAt: string | undefined;
    if (details.publishMode === 'schedule') {
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
      publishAt = at.toISOString();
    }

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

  async get(userId: string, videoId: string): Promise<YouTubeVideoRecord> {
    const record = await this.videos.getById(videoId);
    if (!record || record.userId !== userId) throw new YouTubeVideoError('Video not found', 'NOT_FOUND', 404);
    return record;
  }
}
