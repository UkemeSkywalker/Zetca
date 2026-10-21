/**
 * @jest-environment node
 */

import { YouTubeUploadEngine, nextQuotaReset, MAX_ATTEMPTS, type EngineDeps } from '@/lib/services/youtubeUploadEngine';
import { buildVideoResource, UPLOAD_CHUNK_BYTES } from '@/lib/services/youtubeUploadApi';
import { YouTubeApiError, YouTubeAuthError } from '@/lib/services/youtubeClient';
import { VideoDetailsSchema, toPublicVideo, type YouTubeVideoRecord } from '@/lib/models/youtubeVideo';
import type { YouTubeVideoRepository } from '@/lib/db/youtubeVideoRepository';
import type { MediaRepository } from '@/lib/db/mediaRepository';

const NOW = new Date('2026-10-21T12:00:00.000Z');
const MB = 1024 * 1024;

const details = VideoDetailsSchema.parse({
  title: 'Full body workout',
  description: 'Hello',
  tags: ['workout'],
  categoryId: '26',
  language: 'en',
  translations: [{ language: 'fr', title: 'Entraînement', description: '' }],
  playlistIds: ['PL1234567890'],
  madeForKids: false,
  thumbnailMediaId: '22222222-2222-4222-8222-222222222222',
  captions: { key: 'u1/captions/a.srt', language: 'en', filename: 'a.srt' },
  privacyStatus: 'public',
  publishMode: 'schedule',
  scheduledDate: '2026-10-23',
  scheduledTime: '18:00',
  timeZone: 'Africa/Lagos',
});

function video(patch: Partial<YouTubeVideoRecord> = {}): YouTubeVideoRecord {
  return {
    videoId: 'v1',
    userId: 'u1',
    mediaId: 'm1',
    channelId: 'UC1',
    status: 'uploading',
    details,
    publishAt: '2026-10-23T17:00:00.000Z',
    isShort: false,
    attempts: 1,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...patch,
  };
}

function setup(opts: { fileSize?: number; channelId?: string; youtube?: Partial<EngineDeps['youtube']>; record?: Partial<YouTubeVideoRecord> } = {}) {
  const fileSize = opts.fileSize ?? 20 * MB;
  let stored = video(opts.record);
  const updates: { set: Partial<YouTubeVideoRecord>; remove?: string[] }[] = [];
  const videos = {
    listByStatus: jest.fn(async (status: string) => (stored.status === status ? [stored] : [])),
    claim: jest.fn(async () => {
      stored = { ...stored, status: 'uploading', attempts: (stored.attempts ?? 0) + 1 };
      return stored;
    }),
    update: jest.fn(async (_id: string, set: Partial<YouTubeVideoRecord>, o: { remove?: string[] } = {}) => {
      updates.push({ set, remove: o.remove as string[] });
      stored = { ...stored, ...set };
      for (const key of o.remove ?? []) delete (stored as unknown as Record<string, unknown>)[key];
      return true;
    }),
  };
  const media = {
    getMediaById: jest.fn(async (id: string) =>
      id === 'm1'
        ? { mediaId: 'm1', userId: 'u1', s3Key: 'u1/m1/clip.mp4', contentType: 'video/mp4', fileSize, mediaType: 'video' }
        : { mediaId: id, userId: 'u1', s3Key: 'u1/thumb.jpg', contentType: 'image/jpeg', fileSize: 1000, mediaType: 'image' }
    ),
  };
  const reads: [number, number][] = [];
  const files = {
    read: jest.fn(async (_key: string, start: number, end: number) => {
      reads.push([start, end]);
      return new Uint8Array(end - start + 1);
    }),
    readAll: jest.fn(async () => new Uint8Array(10)),
  };
  let received = 0;
  const youtube = {
    buildVideoResource,
    UPLOAD_CHUNK_BYTES,
    startUpload: jest.fn(async () => 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc'),
    uploadStatus: jest.fn(async () => ({ done: false as const, nextByte: received })),
    uploadChunk: jest.fn(async (_t: string, _s: string, chunk: Uint8Array, start: number, total: number) => {
      received = start + chunk.byteLength;
      return received >= total ? { done: true as const, youtubeVideoId: 'yt123' } : { done: false as const, nextByte: received };
    }),
    setThumbnail: jest.fn(async () => {}),
    addToPlaylist: jest.fn(async () => {}),
    insertCaptions: jest.fn(async () => {}),
    ...opts.youtube,
  };
  const engine = new YouTubeUploadEngine({
    videos: videos as unknown as YouTubeVideoRepository,
    media: media as unknown as MediaRepository,
    files,
    access: async () => ({ accessToken: 'token', channelId: opts.channelId ?? 'UC1' }),
    youtube: youtube as unknown as EngineDeps['youtube'],
    now: () => NOW,
  });
  return { engine, youtube, files, reads, updates, current: () => stored };
}

describe('buildVideoResource', () => {
  it('uploads scheduled videos as private with publishAt, and maps every detail', () => {
    const r = buildVideoResource(details, '2026-10-23T17:00:00.000Z');
    expect(r.status).toMatchObject({ privacyStatus: 'private', publishAt: '2026-10-23T17:00:00.000Z', selfDeclaredMadeForKids: false });
    expect(r.snippet).toMatchObject({ title: 'Full body workout', categoryId: '26', defaultLanguage: 'en', tags: ['workout'] });
    expect(r.localizations).toEqual({ fr: { title: 'Entraînement', description: '' } });
    expect(r).not.toHaveProperty('paidProductPlacementDetails');
  });

  it('uses the chosen visibility when publishing now', () => {
    const r = buildVideoResource({ ...details, privacyStatus: 'unlisted', paidPromotion: true }, undefined);
    expect(r.status.privacyStatus).toBe('unlisted');
    expect(r.status).not.toHaveProperty('publishAt');
    expect(r.paidProductPlacementDetails).toEqual({ hasPaidProductPlacement: true });
  });
});

describe('YouTubeUploadEngine', () => {
  it('uploads in pieces, then adds the thumbnail, playlist and captions, and marks it scheduled', async () => {
    const { engine, youtube, reads, current } = setup({ fileSize: 20 * MB });
    await engine.process(video());
    expect(youtube.startUpload).toHaveBeenCalledTimes(1);
    expect(reads).toEqual([
      [0, 8 * MB - 1],
      [8 * MB, 16 * MB - 1],
      [16 * MB, 20 * MB - 1],
    ]);
    expect(youtube.setThumbnail).toHaveBeenCalledWith('token', 'yt123', expect.any(Uint8Array), 'image/jpeg');
    expect(youtube.addToPlaylist).toHaveBeenCalledWith('token', 'PL1234567890', 'yt123');
    expect(youtube.insertCaptions).toHaveBeenCalledWith('token', 'yt123', 'en', expect.any(Uint8Array));
    expect(current()).toMatchObject({ status: 'scheduled', youtubeVideoId: 'yt123' });
    expect(current().uploadSessionUri).toBeUndefined();
  });

  it('resumes an interrupted upload where YouTube says it stopped', async () => {
    const { engine, youtube, reads } = setup({
      fileSize: 20 * MB,
      record: { uploadSessionUri: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc' },
      youtube: { uploadStatus: jest.fn(async () => ({ done: false as const, nextByte: 16 * MB })) },
    });
    await engine.process(video({ uploadSessionUri: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=abc' }));
    expect(youtube.startUpload).not.toHaveBeenCalled();
    expect(reads).toEqual([[16 * MB, 20 * MB - 1]]);
  });

  it('never uploads twice once YouTube has the video', async () => {
    const { engine, youtube, current } = setup({ record: { youtubeVideoId: 'yt123' } });
    await engine.process(video({ youtubeVideoId: 'yt123' }));
    expect(youtube.startUpload).not.toHaveBeenCalled();
    expect(youtube.uploadChunk).not.toHaveBeenCalled();
    expect(current().status).toBe('scheduled');
  });

  it('turns thumbnail and playlist problems into warnings', async () => {
    const { engine, current } = setup({
      youtube: {
        setThumbnail: jest.fn(async () => {
          throw new YouTubeApiError('forbidden', 403, 'forbidden');
        }),
        addToPlaylist: jest.fn(async () => {
          throw new YouTubeApiError('Playlist not found', 404, 'playlistNotFound');
        }),
      },
    });
    await engine.process(video());
    expect(current().status).toBe('scheduled');
    expect(current().warnings).toEqual([
      expect.stringMatching(/verified channel/),
      expect.stringMatching(/^Playlist: Playlist not found/),
    ]);
  });

  it('waits for the daily limit to reset without counting it as a failed try', async () => {
    const { engine, current } = setup({
      youtube: {
        startUpload: jest.fn(async () => {
          throw new YouTubeApiError('quota', 403, 'quotaExceeded');
        }),
      },
    });
    await engine.process(video({ attempts: 1 }));
    expect(current()).toMatchObject({ status: 'waiting_quota', attempts: 0, nextAttemptAt: '2026-10-22T07:10:00.000Z' });
  });

  it('publishes straight away when the scheduled time has passed', async () => {
    const { engine, youtube, current } = setup();
    await engine.process(video({ publishAt: '2026-10-21T11:00:00.000Z' }));
    const resource = (youtube.startUpload as jest.Mock).mock.calls[0][1];
    expect(resource.status).toMatchObject({ privacyStatus: 'public' });
    expect(resource.status).not.toHaveProperty('publishAt');
    expect(current().status).toBe('published');
    expect(current().warnings?.[0]).toMatch(/scheduled time passed/);
  });

  it('retries temporary errors with backoff, then gives up', async () => {
    const failing = { startUpload: jest.fn(async () => { throw new YouTubeApiError('backend error', 503); }) };
    const first = setup({ youtube: failing });
    await first.engine.process(video({ attempts: 1 }));
    expect(first.current()).toMatchObject({ status: 'queued', nextAttemptAt: '2026-10-21T12:02:00.000Z' });

    const last = setup({ youtube: failing });
    await last.engine.process(video({ attempts: MAX_ATTEMPTS }));
    expect(last.current()).toMatchObject({ status: 'failed', error: { code: 'gave_up' } });
  });

  it('fails with a reconnect message when the sign-in expired', async () => {
    const { engine, current } = setup({
      youtube: { startUpload: jest.fn(async () => { throw new YouTubeAuthError('revoked', 'token_revoked'); }) },
    });
    await engine.process(video());
    expect(current()).toMatchObject({ status: 'failed', error: { code: 'reconnect' } });
  });

  it('refuses to upload to a different channel than the one scheduled', async () => {
    const { engine, youtube, current } = setup({ channelId: 'UC_OTHER' });
    await engine.process(video());
    expect(youtube.startUpload).not.toHaveBeenCalled();
    expect(current()).toMatchObject({ status: 'failed', error: { code: 'channel_changed' } });
  });

  it('fails straight away when YouTube rejects the details', async () => {
    const { engine, current } = setup({
      youtube: { startUpload: jest.fn(async () => { throw new YouTubeApiError('invalid title', 400, 'invalidTitle'); }) },
    });
    await engine.process(video());
    expect(current()).toMatchObject({ status: 'failed', error: { code: 'rejected' } });
  });

  it('claims and handles due queued videos in a cycle', async () => {
    const { engine, current } = setup({ record: { status: 'queued', attempts: 0 } });
    expect(await engine.runCycle()).toBe(1);
    expect(current().status).toBe('scheduled');
  });

  it('skips queued videos still waiting for their next try', async () => {
    const { engine, youtube } = setup({ record: { status: 'queued', nextAttemptAt: '2026-10-21T13:00:00.000Z' } });
    expect(await engine.runCycle()).toBe(0);
    expect(youtube.startUpload).not.toHaveBeenCalled();
  });
});

describe('nextQuotaReset', () => {
  it('is just after midnight Pacific time', () => {
    expect(nextQuotaReset(new Date('2026-10-21T12:00:00Z')).toISOString()).toBe('2026-10-22T07:10:00.000Z');
    // Winter: Pacific is UTC-8
    expect(nextQuotaReset(new Date('2026-12-01T03:00:00Z')).toISOString()).toBe('2026-12-01T08:10:00.000Z');
  });
});

describe('toPublicVideo', () => {
  it('never sends the upload session to the browser', () => {
    const out = toPublicVideo(video({ uploadSessionUri: 'https://secret', heartbeatAt: NOW.toISOString() }));
    expect(out).not.toHaveProperty('uploadSessionUri');
    expect(out).not.toHaveProperty('heartbeatAt');
  });
});

describe('youtubeUploadApi over HTTP', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const respond = (status: number, headers: Record<string, string> = {}, body?: unknown) => {
    const fn = jest.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status, headers }));
    global.fetch = fn as unknown as typeof fetch;
    return fn;
  };

  it('opens a resumable session with the file size, type and notify flag', async () => {
    const { startUpload } = await import('@/lib/services/youtubeUploadApi');
    const fetchMock = respond(200, { location: 'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz' });
    const uri = await startUpload('token', buildVideoResource(details, undefined), { size: 123, contentType: 'video/mp4' }, false);
    expect(uri).toContain('upload_id=xyz');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('uploadType=resumable');
    expect(url).toContain('notifySubscribers=false');
    expect(url).toContain('part=snippet,status');
    expect((init.headers as Record<string, string>)['X-Upload-Content-Length']).toBe('123');
  });

  it('reads progress from 308 Range headers, and the video ID when done', async () => {
    const { uploadChunk, uploadStatus } = await import('@/lib/services/youtubeUploadApi');
    respond(308, { range: 'bytes=0-8388607' });
    await expect(uploadChunk('t', 'https://s', new Uint8Array(4), 0, 100)).resolves.toEqual({ done: false, nextByte: 8388608 });
    respond(308);
    await expect(uploadStatus('t', 'https://s', 100)).resolves.toEqual({ done: false, nextByte: 0 });
    respond(201, {}, { id: 'yt999' });
    await expect(uploadChunk('t', 'https://s', new Uint8Array(4), 96, 100)).resolves.toEqual({ done: true, youtubeVideoId: 'yt999' });
  });

  it('reports an expired session and quota errors distinctly', async () => {
    const { uploadStatus, addToPlaylist } = await import('@/lib/services/youtubeUploadApi');
    respond(404);
    await expect(uploadStatus('t', 'https://s', 100)).rejects.toMatchObject({ reason: 'sessionExpired' });
    respond(403, {}, { error: { message: 'quota', errors: [{ reason: 'quotaExceeded' }] } });
    await expect(addToPlaylist('t', 'PL1', 'yt1')).rejects.toMatchObject({ status: 403, reason: 'quotaExceeded' });
    respond(401, {}, {});
    await expect(addToPlaylist('t', 'PL1', 'yt1')).rejects.toMatchObject({ code: 'token_revoked' });
  });
});
