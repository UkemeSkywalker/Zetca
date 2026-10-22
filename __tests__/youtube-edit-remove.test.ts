/**
 * @jest-environment node
 */

import { planYouTubeUpdate } from '@/lib/youtube/sync';
import { VideoDetailsSchema } from '@/lib/models/youtubeVideo';
import { removeCopy, canEdit } from '@/lib/content/itemActions';
import { rejectionMessage, YouTubeUploadEngine, type EngineDeps } from '@/lib/services/youtubeUploadEngine';
import type { YouTubeVideoResource } from '@/lib/services/youtubeUploadApi';
import type { YouTubeVideoRepository } from '@/lib/db/youtubeVideoRepository';
import type { ScheduledPost } from '@/types/scheduler';

const before = VideoDetailsSchema.parse({
  title: 'Old title',
  description: 'Old description',
  tags: ['a'],
  categoryId: '22',
  language: 'en',
  madeForKids: false,
  publishMode: 'schedule',
  scheduledDate: '2026-10-30',
  scheduledTime: '18:00',
  timeZone: 'Africa/Lagos',
});

const current: YouTubeVideoResource = {
  id: 'yt1',
  snippet: { title: 'Old title', description: 'Edited in Studio', tags: ['a', 'studio-tag'], categoryId: '22', defaultLanguage: 'en' },
  status: { privacyStatus: 'private', publishAt: '2026-10-30T17:00:00.000Z', license: 'youtube', embeddable: true, publicStatsViewable: true, selfDeclaredMadeForKids: false },
};

describe('planYouTubeUpdate', () => {
  it('changes only what changed in Zetca, keeping Studio edits', () => {
    const after = { ...before, title: 'New title' };
    const plan = planYouTubeUpdate(current, before, after, { scheduled: true, publishAtBefore: '2026-10-30T17:00:00.000Z', publishAtAfter: '2026-10-30T17:00:00.000Z' });
    expect(plan.parts).toEqual(['snippet']);
    expect(plan.resource.snippet).toMatchObject({ title: 'New title', description: 'Edited in Studio', tags: ['a', 'studio-tag'] });
  });

  it('sends nothing when nothing changed', () => {
    const plan = planYouTubeUpdate(current, before, before, { scheduled: true, publishAtBefore: 'x', publishAtAfter: 'x' });
    expect(plan.parts).toEqual([]);
  });

  it('moves the publish time, or publishes now', () => {
    const moved = planYouTubeUpdate(current, before, before, { scheduled: true, publishAtBefore: '2026-10-30T17:00:00.000Z', publishAtAfter: '2026-11-01T09:00:00.000Z' });
    expect(moved.resource.status).toMatchObject({ privacyStatus: 'private', publishAt: '2026-11-01T09:00:00.000Z' });
    const now = planYouTubeUpdate(current, before, { ...before, publishMode: 'now' }, { scheduled: true, publishAtBefore: '2026-10-30T17:00:00.000Z' });
    expect(now.resource.status?.privacyStatus).toBe('public');
    expect(now.resource.status).not.toHaveProperty('publishAt');
  });

  it('changes visibility of a published video without touching other status fields', () => {
    const live: YouTubeVideoResource = { ...current, status: { ...current.status, privacyStatus: 'public', publishAt: undefined, embeddable: false } };
    const plan = planYouTubeUpdate(live, { ...before, privacyStatus: 'public' }, { ...before, privacyStatus: 'unlisted' }, { scheduled: false });
    expect(plan.parts).toEqual(['status']);
    expect(plan.resource.status).toMatchObject({ privacyStatus: 'unlisted', embeddable: false });
  });
});

const item = (patch: Partial<ScheduledPost>): ScheduledPost =>
  ({ id: 'p1', platform: 'linkedin', status: 'scheduled', content: 'x', scheduledDate: '2026-10-30', scheduledTime: '10:00', ...patch }) as ScheduledPost;

describe('edit and delete wording', () => {
  it('says what happens on the platform', () => {
    expect(removeCopy(item({})).confirmLabel).toBe('Delete post');
    expect(removeCopy(item({ status: 'published' })).message).toMatch(/stays on LinkedIn/);
    expect(removeCopy(item({ platform: 'youtube', youtube: { videoId: 'v', status: 'queued' } })).confirmLabel).toBe('Cancel video');
    expect(removeCopy(item({ platform: 'youtube', youtube: { videoId: 'v', status: 'scheduled', youtubeVideoId: 'yt' } })).message).toMatch(/still goes public/);
  });

  it('allows edits until published (posts) or any time but mid-upload (YouTube)', () => {
    expect(canEdit(item({ status: 'published' }))).toBe(false);
    expect(canEdit(item({ platform: 'youtube', status: 'published', youtube: { videoId: 'v', status: 'published', youtubeVideoId: 'yt' } }))).toBe(true);
    expect(canEdit(item({ platform: 'youtube', youtube: { videoId: 'v', status: 'uploading' } }))).toBe(false);
  });
});

describe('settling scheduled videos', () => {
  function setup(resource: YouTubeVideoResource | null) {
    const updates: Record<string, unknown>[] = [];
    const videos = {
      listDueScheduled: jest.fn(async () => [{ videoId: 'v1', userId: 'u1', youtubeVideoId: 'yt1', status: 'scheduled', publishAt: '2026-10-21T20:00:00.000Z' }]),
      listByStatus: jest.fn(async () => []),
      update: jest.fn(async (_id: string, set: Record<string, unknown>) => {
        updates.push(set);
        return true;
      }),
    };
    const engine = new YouTubeUploadEngine({
      videos: videos as unknown as YouTubeVideoRepository,
      access: async () => ({ accessToken: 't', channelId: 'UC1' }),
      youtube: { getVideoResource: jest.fn(async () => resource) } as unknown as EngineDeps['youtube'],
      now: () => new Date('2026-10-22T08:00:00Z'),
      media: {} as never,
      files: {} as never,
    });
    return { engine, updates };
  }

  it('marks a public video as published', async () => {
    const { engine, updates } = setup({ id: 'yt1', status: { uploadStatus: 'processed', privacyStatus: 'public' } });
    await engine.settleScheduled();
    expect(updates).toEqual([{ status: 'published' }]);
  });

  it('reports a copyright rejection in plain words', async () => {
    const { engine, updates } = setup({ id: 'yt1', status: { uploadStatus: 'rejected', rejectionReason: 'copyright' } });
    await engine.settleScheduled();
    expect(updates[0]).toMatchObject({ status: 'failed', error: { code: 'youtube_rejected', message: rejectionMessage('copyright') } });
  });

  it('notices a video deleted on YouTube', async () => {
    const { engine, updates } = setup(null);
    await engine.settleScheduled();
    expect(updates[0]).toMatchObject({ status: 'failed', error: { code: 'deleted' } });
  });
});

describe('copyright and block checks', () => {
  function setup(resource: YouTubeVideoResource | null) {
    const updates: Record<string, unknown>[] = [];
    const videos = {
      listDueChecks: jest.fn(async () => [{ videoId: 'v1', userId: 'u1', youtubeVideoId: 'yt1', status: 'scheduled' }]),
      update: jest.fn(async (_id: string, set: Record<string, unknown>) => {
        updates.push(set);
        return true;
      }),
    };
    const engine = new YouTubeUploadEngine({
      videos: videos as unknown as YouTubeVideoRepository,
      access: async () => ({ accessToken: 't', channelId: 'UC1' }),
      youtube: { getVideoResource: jest.fn(async () => resource) } as unknown as EngineDeps['youtube'],
      now: () => new Date('2026-10-22T08:00:00Z'),
      media: {} as never,
      files: {} as never,
    });
    return { engine, updates };
  }

  it('flags a scheduled video YouTube blocked for copyright before it goes public', async () => {
    const { engine, updates } = setup({ id: 'yt1', status: { uploadStatus: 'rejected', rejectionReason: 'claim' } });
    await engine.checkUploaded();
    expect(updates[0]).toMatchObject({ status: 'failed', error: { code: 'youtube_rejected', message: rejectionMessage('claim') } });
  });

  it('records a clean check with its time', async () => {
    const { engine, updates } = setup({ id: 'yt1', status: { uploadStatus: 'processed', privacyStatus: 'private' } });
    await engine.checkUploaded();
    expect(updates).toEqual([{ youtubeCheck: { uploadStatus: 'processed', checkedAt: '2026-10-22T08:00:00.000Z' } }]);
  });
});
