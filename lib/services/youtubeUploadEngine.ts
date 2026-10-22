/**
 * Uploads scheduled videos to YouTube.
 *
 * Each cycle claims due videos one at a time (a conditional write, so two
 * servers never upload the same one) and:
 *   1. streams the file from S3 to YouTube in pieces, resuming an interrupted
 *      upload where it stopped;
 *   2. sets the thumbnail, playlists and captions (problems here are warnings,
 *      not failures: the video is already up);
 *   3. marks it scheduled (private until publishAt) or published.
 *
 * When YouTube's daily limit is reached the video waits until the limit resets
 * (midnight Pacific time). Temporary errors retry with backoff; errors retrying
 * can't fix fail straight away with a message the creator can act on.
 */

import { GetObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getConfig } from '@/lib/config';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { YouTubeVideoRepository } from '@/lib/db/youtubeVideoRepository';
import type { YouTubeVideoRecord } from '@/lib/models/youtubeVideo';
import { getYouTubeAccess, forgetYouTubeAccess, type YouTubeAccess } from './youtubeAccess';
import { YouTubeApiError, YouTubeAuthError } from './youtubeClient';
import * as api from './youtubeUploadApi';
import { zonedToUtcSlot } from '@/lib/scheduling/time';

export const MAX_ATTEMPTS = 5;
/** Minutes to wait before attempt 2, 3, 4, 5 */
const BACKOFF_MINUTES = [2, 10, 30, 120];
/** A worker that hasn't sent a heartbeat for this long is treated as gone */
const STALE_AFTER_MS = 15 * 60 * 1000;
/** A scheduled time this close (or past) is published straight away instead */
const LATE_MARGIN_MS = 5 * 60 * 1000;
const PER_CYCLE = 5;

/** Reasons YouTube gives when the daily upload or API limit is used up */
const QUOTA_REASONS = new Set(['quotaExceeded', 'uploadLimitExceeded', 'dailyLimitExceeded']);

/** Just after YouTube's quota resets (midnight Pacific time) */
export function nextQuotaReset(now: Date): Date {
  const la = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const [y, m, d] = la.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1));
  const date = tomorrow.toISOString().slice(0, 10);
  const slot = zonedToUtcSlot(date, '00:10', 'America/Los_Angeles');
  return new Date(`${slot.date}T${slot.time}:00.000Z`);
}

type Outcome =
  | { kind: 'done'; status: 'scheduled' | 'published'; warnings: string[] }
  | { kind: 'quota' }
  | { kind: 'retry'; message: string }
  | { kind: 'fail'; code: string; message: string };

/** What to do about an error */
export function classify(error: unknown): Outcome {
  if (error instanceof YouTubeAuthError) {
    return {
      kind: 'fail',
      code: 'reconnect',
      message:
        error.code === 'not_connected'
          ? 'No YouTube channel is connected. Connect your channel in Profile, then retry.'
          : 'Your YouTube sign-in has expired. Reconnect your channel in Profile, then retry.',
    };
  }
  if (error instanceof VideoFileMissing) {
    return { kind: 'fail', code: 'file_missing', message: 'The video file is missing. Upload it again.' };
  }
  if (error instanceof ChannelChanged) {
    return {
      kind: 'fail',
      code: 'channel_changed',
      message: 'A different YouTube channel is connected now. Retry to upload to that channel.',
    };
  }
  if (error instanceof YouTubeApiError) {
    if (error.reason && QUOTA_REASONS.has(error.reason)) return { kind: 'quota' };
    if (error.status === 429 || error.status >= 500 || error.reason === 'rateLimitExceeded') {
      return { kind: 'retry', message: error.message };
    }
    if (error.reason === 'youtubeSignupRequired') {
      return { kind: 'fail', code: 'no_channel', message: 'This Google account has no YouTube channel yet. Create one, then retry.' };
    }
    if (error.status === 400 || error.status === 403) {
      return { kind: 'fail', code: 'rejected', message: `YouTube rejected the video: ${error.message}` };
    }
  }
  // Network errors, timeouts and anything unexpected: worth another go
  return { kind: 'retry', message: (error as Error)?.message || 'Upload failed' };
}

/** YouTube's rejection reasons, in words a creator can act on */
export function rejectionMessage(reason: string): string {
  const messages: Record<string, string> = {
    copyright: 'YouTube blocked this video for copyright. See the details in YouTube Studio.',
    claim: 'YouTube blocked this video because of a copyright claim. See the details in YouTube Studio.',
    duplicate: 'YouTube rejected this video as a duplicate of one already on the channel.',
    trademark: 'YouTube rejected this video for trademark reasons. See YouTube Studio for details.',
    inappropriate: 'YouTube rejected this video for breaking its community guidelines.',
    termsOfUse: 'YouTube rejected this video for breaking its terms of use.',
    legal: 'YouTube rejected this video for legal reasons.',
    length: 'YouTube rejected this video because it is too long for the channel.',
    uploaderAccountSuspended: 'YouTube rejected this video because the channel is suspended.',
    uploaderAccountClosed: 'YouTube rejected this video because the channel is closed.',
  };
  return messages[reason] ?? `YouTube didn’t accept this video (${reason}). See YouTube Studio for details.`;
}

class VideoFileMissing extends Error {}
class ChannelChanged extends Error {}

/** Reads byte ranges of an S3 object */
export interface FileSource {
  read(key: string, start: number, end: number): Promise<Uint8Array>;
  readAll(key: string): Promise<Uint8Array>;
}

export function s3FileSource(): FileSource {
  const cfg = getConfig();
  const s3Config: S3ClientConfig = { region: cfg.awsRegion };
  if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
    s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
  }
  const s3 = new S3Client(s3Config);
  const get = async (key: string, range?: string) => {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: cfg.s3MediaBucket, Key: key, Range: range }));
      return await res.Body!.transformToByteArray();
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') throw new VideoFileMissing();
      throw error;
    }
  };
  return {
    read: (key, start, end) => get(key, `bytes=${start}-${end}`),
    readAll: (key) => get(key),
  };
}

export interface EngineDeps {
  videos: YouTubeVideoRepository;
  media: MediaRepository;
  files: FileSource;
  access: (userId: string) => Promise<YouTubeAccess>;
  youtube: typeof api;
  now: () => Date;
}

export class YouTubeUploadEngine {
  private deps: EngineDeps;

  constructor(deps: Partial<EngineDeps> = {}) {
    this.deps = {
      videos: deps.videos ?? new YouTubeVideoRepository(),
      media: deps.media ?? new MediaRepository(),
      files: deps.files ?? s3FileSource(),
      access: deps.access ?? ((userId) => getYouTubeAccess(userId)),
      youtube: deps.youtube ?? api,
      now: deps.now ?? (() => new Date()),
    };
  }

  /**
   * Checks scheduled videos whose publish time has passed: published, or
   * rejected by YouTube (copyright, duplicate…), or deleted there.
   */
  async settleScheduled(): Promise<void> {
    const { videos, access, youtube, now } = this.deps;
    const at = now();
    for (const video of await videos.listDueScheduled(at)) {
      try {
        const { accessToken } = await access(video.userId);
        const current = await youtube.getVideoResource(accessToken, video.youtubeVideoId!);
        if (!current) {
          await videos.update(video.videoId, { status: 'failed', error: { code: 'deleted', message: 'This video was deleted on YouTube.' } });
          continue;
        }
        const s = current.status ?? {};
        if (s.uploadStatus === 'rejected' || s.uploadStatus === 'failed') {
          const reason = s.rejectionReason ?? s.failureReason ?? 'unknown';
          await videos.update(video.videoId, {
            status: 'failed',
            error: { code: `youtube_${s.uploadStatus}`, message: rejectionMessage(reason) },
          });
        } else if (s.privacyStatus === 'private' && s.publishAt && new Date(s.publishAt) > at) {
          // The time was moved in YouTube Studio
          await videos.update(video.videoId, { publishAt: new Date(s.publishAt).toISOString() });
        } else {
          await videos.update(video.videoId, { status: 'published' });
        }
      } catch (error) {
        // Can't ask YouTube (e.g. signed out): after a day, assume YouTube published it
        if (at.getTime() - new Date(video.publishAt!).getTime() > 24 * 60 * 60 * 1000) {
          await videos.update(video.videoId, { status: 'published' });
        } else {
          console.warn(`Couldn't check YouTube video ${video.youtubeVideoId}: ${(error as Error).message}`);
        }
      }
    }
  }

  /**
   * Copyright alerts: checks videos on YouTube every 20 minutes (scheduled
   * ones until they go public, others for 2 days after upload) and marks a
   * video failed, with YouTube's reason, as soon as YouTube blocks it.
   */
  async checkUploaded(): Promise<void> {
    const { videos, access, youtube, now } = this.deps;
    const at = now();
    const due = await videos.listDueChecks(new Date(at.getTime() - 2 * 24 * 60 * 60 * 1000), new Date(at.getTime() - 20 * 60 * 1000));
    for (const video of due) {
      try {
        const { accessToken } = await access(video.userId);
        const current = await youtube.getVideoResource(accessToken, video.youtubeVideoId!);
        if (!current) {
          await videos.update(video.videoId, { status: 'failed', error: { code: 'deleted', message: 'This video was deleted on YouTube.' } });
          continue;
        }
        const s = current.status ?? {};
        if (s.uploadStatus === 'rejected' || s.uploadStatus === 'failed') {
          const reason = s.rejectionReason ?? s.failureReason ?? 'unknown';
          await videos.update(video.videoId, {
            status: 'failed',
            error: { code: `youtube_${s.uploadStatus}`, message: rejectionMessage(reason) },
            youtubeCheck: { uploadStatus: s.uploadStatus, checkedAt: at.toISOString() },
          });
        } else {
          await videos.update(video.videoId, { youtubeCheck: { uploadStatus: s.uploadStatus ?? 'unknown', checkedAt: at.toISOString() } });
        }
      } catch (error) {
        console.warn(`Couldn't check YouTube video ${video.youtubeVideoId}: ${(error as Error).message}`);
      }
    }
  }

  /** Uploads the videos that are due. Returns how many were handled. */
  async runCycle(): Promise<number> {
    const { videos, now } = this.deps;
    await this.settleScheduled().catch((e) => console.error(`Settling scheduled videos failed: ${(e as Error)?.message ?? e}`));
    await this.checkUploaded().catch((e) => console.error(`Checking uploaded videos failed: ${(e as Error)?.message ?? e}`));
    const at = now();
    const staleBefore = new Date(at.getTime() - STALE_AFTER_MS);
    const candidates = [
      ...(await videos.listByStatus('queued', PER_CYCLE)),
      ...(await videos.listByStatus('waiting_quota', PER_CYCLE)).filter((v) => !v.nextAttemptAt || new Date(v.nextAttemptAt) <= at),
      ...(await videos.listByStatus('uploading', PER_CYCLE)).filter((v) => !v.heartbeatAt || new Date(v.heartbeatAt) < staleBefore),
    ]
      .filter((v) => !v.nextAttemptAt || new Date(v.nextAttemptAt) <= at)
      .slice(0, PER_CYCLE);

    let handled = 0;
    for (const candidate of candidates) {
      const claimed = await videos.claim(candidate.videoId, now(), staleBefore);
      if (!claimed) continue;
      await this.process(claimed);
      handled++;
    }
    return handled;
  }

  /**
   * Starts one video straight away (right after it's scheduled), instead of
   * waiting for the next cycle. Does nothing if another worker claimed it.
   */
  async processNow(videoId: string): Promise<void> {
    const at = this.deps.now();
    const claimed = await this.deps.videos.claim(videoId, at, new Date(at.getTime() - STALE_AFTER_MS));
    if (claimed) await this.process(claimed);
  }

  /** Uploads one claimed video and records how it went */
  async process(video: YouTubeVideoRecord): Promise<void> {
    let outcome: Outcome;
    try {
      outcome = await this.upload(video);
    } catch (error) {
      outcome = classify(error);
      if (outcome.kind === 'fail' && outcome.code === 'reconnect') forgetYouTubeAccess(video.userId);
    }
    await this.record(video, outcome);
  }

  private async record(video: YouTubeVideoRecord, outcome: Outcome): Promise<void> {
    const { videos, now } = this.deps;
    const attempts = video.attempts ?? 1;
    switch (outcome.kind) {
      case 'done':
        await videos.update(
          video.videoId,
          { status: outcome.status, uploadedAt: now().toISOString(), ...(outcome.warnings.length ? { warnings: outcome.warnings } : {}) },
          { remove: ['heartbeatAt', 'uploadSessionUri', 'error', 'nextAttemptAt'] }
        );
        return;
      case 'quota':
        await videos.update(
          video.videoId,
          {
            status: 'waiting_quota',
            nextAttemptAt: nextQuotaReset(now()).toISOString(),
            // A wait for the daily limit isn't a failed attempt
            attempts: Math.max(0, attempts - 1),
          },
          { remove: ['heartbeatAt'] }
        );
        return;
      case 'retry':
        if (attempts >= MAX_ATTEMPTS) {
          await videos.update(
            video.videoId,
            { status: 'failed', error: { code: 'gave_up', message: `Zetca couldn’t reach YouTube after ${attempts} tries: ${outcome.message}` } },
            { remove: ['heartbeatAt'] }
          );
          return;
        }
        await videos.update(
          video.videoId,
          {
            status: 'queued',
            nextAttemptAt: new Date(now().getTime() + BACKOFF_MINUTES[attempts - 1] * 60_000).toISOString(),
            error: { code: 'retrying', message: outcome.message },
          },
          { remove: ['heartbeatAt'] }
        );
        return;
      case 'fail':
        await videos.update(
          video.videoId,
          { status: 'failed', error: { code: outcome.code, message: outcome.message } },
          { remove: ['heartbeatAt'] }
        );
    }
  }

  private async upload(video: YouTubeVideoRecord): Promise<Outcome> {
    const { videos, media, files, access, youtube, now } = this.deps;
    const auth = await access(video.userId);
    if (auth.channelId !== video.channelId) throw new ChannelChanged();

    const file = await media.getMediaById(video.mediaId);
    if (!file || file.userId !== video.userId) throw new VideoFileMissing();

    let youtubeVideoId = video.youtubeVideoId;
    let lateNote: string | null = null;

    if (!youtubeVideoId) {
      // A time that has passed (e.g. after waiting for the daily limit) can't be scheduled: publish now instead
      let publishAt = video.publishAt;
      if (publishAt && new Date(publishAt).getTime() < now().getTime() + LATE_MARGIN_MS) {
        publishAt = undefined;
        lateNote = 'The scheduled time passed before YouTube accepted the upload, so it was published as soon as it went up.';
      }
      // Scheduling is only allowed for public videos, so a late one goes up public
      const resource = api.buildVideoResource(video.details, publishAt);

      let session = video.uploadSessionUri;
      let nextByte = 0;
      if (session) {
        try {
          const status = await youtube.uploadStatus(auth.accessToken, session, file.fileSize);
          if (status.done) youtubeVideoId = status.youtubeVideoId;
          else nextByte = status.nextByte;
        } catch (error) {
          if (!(error instanceof YouTubeApiError && error.reason === 'sessionExpired')) throw error;
          session = undefined;
        }
      }
      if (!youtubeVideoId && !session) {
        session = await youtube.startUpload(
          auth.accessToken,
          resource,
          { size: file.fileSize, contentType: file.contentType },
          video.details.notifySubscribers
        );
        await videos.update(video.videoId, { uploadSessionUri: session, uploadedBytes: 0, totalBytes: file.fileSize });
      }

      while (!youtubeVideoId) {
        const end = Math.min(nextByte + api.UPLOAD_CHUNK_BYTES, file.fileSize) - 1;
        const chunk = await files.read(file.s3Key, nextByte, end);
        // Fresh token each piece: a long upload can outlast an access token
        const token = (await access(video.userId)).accessToken;
        const progress = await youtube.uploadChunk(token, session!, chunk, nextByte, file.fileSize);
        if (progress.done) {
          youtubeVideoId = progress.youtubeVideoId;
        } else {
          nextByte = progress.nextByte;
          await videos.update(video.videoId, { uploadedBytes: nextByte, heartbeatAt: now().toISOString() });
        }
      }
      // Saved straight away, so a crash after this point never uploads the video twice
      await videos.update(video.videoId, {
        youtubeVideoId,
        uploadedBytes: file.fileSize,
        heartbeatAt: now().toISOString(),
      });
    }

    const warnings = await this.finish(video, youtubeVideoId, auth.accessToken);
    if (lateNote) warnings.unshift(lateNote);
    const scheduled = !lateNote && !!video.publishAt;
    return { kind: 'done', status: scheduled ? 'scheduled' : 'published', warnings };
  }

  /** Thumbnail, playlists and captions. The video is up already, so problems become warnings. */
  private async finish(video: YouTubeVideoRecord, youtubeVideoId: string, accessToken: string): Promise<string[]> {
    const { media, files, youtube } = this.deps;
    const { details } = video;
    const warnings: string[] = [];
    const attempt = async (what: string, fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (error) {
        if (error instanceof YouTubeApiError && error.reason && QUOTA_REASONS.has(error.reason)) {
          warnings.push(`${what}: YouTube’s daily limit was reached. Add it in YouTube Studio.`);
        } else if (error instanceof YouTubeApiError && error.status === 403 && what === 'Thumbnail') {
          warnings.push('Thumbnail: custom thumbnails need a verified channel. Verify your channel, then add it in YouTube Studio.');
        } else {
          warnings.push(`${what}: ${(error as Error).message}. Add it in YouTube Studio.`);
        }
      }
    };

    if (details.thumbnailMediaId && !video.isShort) {
      await attempt('Thumbnail', async () => {
        const thumb = await media.getMediaById(details.thumbnailMediaId!);
        if (!thumb || thumb.userId !== video.userId) throw new Error('the image is missing');
        await youtube.setThumbnail(accessToken, youtubeVideoId, await files.readAll(thumb.s3Key), thumb.contentType);
      });
    }
    for (const playlistId of details.playlistIds) {
      await attempt('Playlist', () => youtube.addToPlaylist(accessToken, playlistId, youtubeVideoId));
    }
    if (details.captions) {
      await attempt('Captions', async () => {
        await youtube.insertCaptions(accessToken, youtubeVideoId, details.captions!.language, await files.readAll(details.captions!.key));
      });
    }
    return warnings;
  }
}
