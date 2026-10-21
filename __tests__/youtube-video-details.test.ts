/**
 * @jest-environment node
 */

import { VideoDetailsSchema, tagsLength } from '@/lib/models/youtubeVideo';
import { addChapterLine, chapterProblem, parseChapters } from '@/lib/youtube/chapters';
import { draftToInput, newDraft, sectionForField, titleFromFilename, validateDraft } from '@/lib/youtube/draft';
import { cleanVideoCopy } from '@/lib/youtube/videoCopy';
import { defaultLanguage } from '@/lib/youtube/languages';
import { YouTubeVideoService, publishInstant } from '@/lib/services/youtubeVideoService';
import type { YouTubeVideoRepository } from '@/lib/db/youtubeVideoRepository';
import type { MediaRepository } from '@/lib/db/mediaRepository';
import type { UserRepository } from '@/lib/db/userRepository';

const NOW = new Date('2026-10-20T12:00:00.000Z');
const draft = () => ({ ...newDraft('my_workout-final.mp4', { language: 'en', timeZone: 'Africa/Lagos', now: NOW }), madeForKids: false });

describe('video details rules', () => {
  it('accepts a complete draft', () => {
    expect(validateDraft(draft())).toEqual({});
  });

  it('needs an answer about kids content', () => {
    expect(validateDraft({ ...draft(), madeForKids: null })).toHaveProperty('madeForKids');
  });

  it('applies YouTube’s title rules', () => {
    expect(validateDraft({ ...draft(), title: '   ' }).title).toBe('Add a title');
    expect(validateDraft({ ...draft(), title: 'x'.repeat(101) }).title).toMatch(/100/);
    expect(validateDraft({ ...draft(), title: 'Best <video>' }).title).toMatch(/< or >/);
  });

  it('counts the description limit in bytes, like YouTube', () => {
    expect(validateDraft({ ...draft(), description: 'a'.repeat(5000) })).toEqual({});
    expect(validateDraft({ ...draft(), description: '€'.repeat(2000) })).toHaveProperty('description');
  });

  it('counts tags the way YouTube does', () => {
    expect(tagsLength([])).toBe(0);
    expect(tagsLength(['a', 'bc'])).toBe(4); // a,bc
    expect(tagsLength(['home workout'])).toBe(14); // "home workout"
    const many = Array.from({ length: 60 }, (_, i) => `tag number ${i}`);
    expect(validateDraft({ ...draft(), tags: many })).toHaveProperty('tags');
  });

  it('only schedules public videos, with a date, time and zone', () => {
    expect(validateDraft({ ...draft(), privacyStatus: 'unlisted' })).toHaveProperty('publishMode');
    expect(validateDraft({ ...draft(), privacyStatus: 'unlisted', publishMode: 'now' })).toEqual({});
    expect(validateDraft({ ...draft(), scheduledDate: '' })).toHaveProperty('scheduledDate');
  });

  it('drops the schedule fields when publishing now', () => {
    const input = draftToInput({ ...draft(), publishMode: 'now' });
    expect(input.scheduledDate).toBeUndefined();
    expect(VideoDetailsSchema.parse(input).publishMode).toBe('now');
  });

  it('refuses the same translation language twice', () => {
    const t = { language: 'fr', title: 'Titre', description: '' };
    expect(validateDraft({ ...draft(), translations: [t, t] })).toHaveProperty('translations');
  });

  it('maps errors to the section that shows them', () => {
    expect(sectionForField('madeForKids')).toBe('audience');
    expect(sectionForField('scheduledTime')).toBe('visibility');
    expect(sectionForField('translations.0.title')).toBe('details');
  });

  it('starts from the file name, tomorrow at 18:00', () => {
    const d = draft();
    expect(d.title).toBe('My workout final');
    expect(d.scheduledDate).toBe('2026-10-21');
    expect(d.scheduledTime).toBe('18:00');
    expect(titleFromFilename('<b>clip.mov')).toBe('Bclip');
  });

  it('picks the browser language when YouTube supports it', () => {
    expect(defaultLanguage('pt-BR')).toBe('pt-BR');
    expect(defaultLanguage('fr-CA')).toBe('fr');
    expect(defaultLanguage('xx-YY')).toBe('en');
  });
});

describe('chapters', () => {
  const desc = 'Workout\n\n00:00 Intro\n0:45 Warm up\n2:10 - Squats\n1:02:03 Cool down';

  it('reads timestamps from the description', () => {
    expect(parseChapters(desc).map((c) => [c.seconds, c.title])).toEqual([
      [0, 'Intro'],
      [45, 'Warm up'],
      [130, 'Squats'],
      [3723, 'Cool down'],
    ]);
  });

  it('explains why YouTube would ignore them', () => {
    expect(chapterProblem(parseChapters(desc))).toBeNull();
    expect(chapterProblem(parseChapters('0:05 Intro\n1:00 A\n2:00 B'))).toMatch(/00:00/);
    expect(chapterProblem(parseChapters('0:00 Intro\n1:00 A'))).toMatch(/at least 3/);
    expect(chapterProblem(parseChapters('0:00 Intro\n0:05 A\n2:00 B'))).toMatch(/10 seconds/);
    expect(chapterProblem([])).toBeNull();
  });

  it('adds a first chapter, then later ones', () => {
    const first = addChapterLine('About this video');
    expect(first).toBe('About this video\n\n00:00 Intro');
    expect(addChapterLine(first, 600)).toBe('About this video\n\n00:00 Intro\n01:40 ');
  });
});

describe('cleanVideoCopy', () => {
  it('makes AI copy fit YouTube’s rules', () => {
    const copy = cleanVideoCopy({
      title: `<Great> ${'word '.repeat(30)}`,
      description: 'Hello <world>',
      tags: ['#Fitness', 'fitness', 'home, workout', ''],
    });
    expect(copy.title.length).toBeLessThanOrEqual(100);
    expect(copy.title).not.toMatch(/[<>]/);
    expect(copy.description).toBe('Hello world');
    expect(copy.tags).toEqual(['fitness', 'home workout']);
  });
});

describe('publishInstant', () => {
  it('turns a wall-clock time in a zone into UTC', () => {
    expect(publishInstant('2026-10-23', '18:00', 'Africa/Lagos').toISOString()).toBe('2026-10-23T17:00:00.000Z');
    expect(publishInstant('2026-07-01', '09:30', 'America/New_York').toISOString()).toBe('2026-07-01T13:30:00.000Z');
  });
});

describe('YouTubeVideoService.create', () => {
  const MEDIA_ID = '11111111-1111-4111-8111-111111111111';
  const THUMB_ID = '22222222-2222-4222-8222-222222222222';

  function setup(overrides: { media?: object | null; thumb?: object | null; user?: object | null; existing?: object | null } = {}) {
    const media: Record<string, object | null> = {
      [MEDIA_ID]:
        overrides.media === undefined
          ? { mediaId: MEDIA_ID, userId: 'u1', mediaType: 'video', status: 'ready', width: 1080, height: 1920, durationSeconds: 40 }
          : overrides.media,
      [THUMB_ID]:
        overrides.thumb === undefined
          ? { mediaId: THUMB_ID, userId: 'u1', mediaType: 'image', contentType: 'image/jpeg', fileSize: 200_000 }
          : overrides.thumb,
    };
    const videos = { create: jest.fn(async (r) => r), findByMedia: jest.fn(async () => overrides.existing ?? null) };
    const mediaRepo = { getMediaById: jest.fn(async (id: string) => media[id] ?? null) };
    const users = {
      getUserById: jest.fn(async () =>
        overrides.user === undefined ? { userId: 'u1', youtubeChannelId: 'UC1', youtubeRefreshTokenEnc: 'v1.x' } : overrides.user
      ),
    };
    const service = new YouTubeVideoService(
      videos as unknown as YouTubeVideoRepository,
      mediaRepo as unknown as MediaRepository,
      users as unknown as UserRepository,
      () => NOW
    );
    return { service, videos };
  }

  const body = (patch: object = {}) => ({ mediaId: MEDIA_ID, details: { ...draftToInput(draft()), ...patch } });

  it('queues the video with its publish time in UTC', async () => {
    const { service, videos } = setup();
    const video = await service.create('u1', body({ thumbnailMediaId: THUMB_ID }));
    expect(video).toMatchObject({
      userId: 'u1',
      mediaId: MEDIA_ID,
      channelId: 'UC1',
      status: 'queued',
      publishAt: '2026-10-21T17:00:00.000Z',
      isShort: true,
    });
    expect(videos.create).toHaveBeenCalled();
  });

  it('returns field errors relative to the details', async () => {
    const { service } = setup();
    await expect(service.create('u1', body({ title: '' }))).rejects.toMatchObject({
      statusCode: 400,
      fields: { title: 'Add a title' },
    });
  });

  it('needs a connected channel', async () => {
    const { service } = setup({ user: { userId: 'u1' } });
    await expect(service.create('u1', body())).rejects.toMatchObject({ code: 'NOT_CONNECTED' });
  });

  it('refuses someone else’s video, or one still uploading', async () => {
    await expect(setup({ media: { mediaId: MEDIA_ID, userId: 'u2', mediaType: 'video' } }).service.create('u1', body())).rejects.toMatchObject({
      statusCode: 404,
    });
    await expect(
      setup({ media: { mediaId: MEDIA_ID, userId: 'u1', mediaType: 'video', status: 'uploading' } }).service.create('u1', body())
    ).rejects.toMatchObject({ code: 'MEDIA_NOT_READY' });
  });

  it('checks the thumbnail is the user’s JPG or PNG under 2 MB', async () => {
    const big = { mediaId: THUMB_ID, userId: 'u1', contentType: 'image/jpeg', fileSize: 3_000_000 };
    await expect(setup({ thumb: big }).service.create('u1', body({ thumbnailMediaId: THUMB_ID }))).rejects.toHaveProperty(
      'fields.thumbnailMediaId'
    );
    const theirs = { mediaId: THUMB_ID, userId: 'u2', contentType: 'image/jpeg', fileSize: 1000 };
    await expect(setup({ thumb: theirs }).service.create('u1', body({ thumbnailMediaId: THUMB_ID }))).rejects.toHaveProperty(
      'fields.thumbnailMediaId'
    );
  });

  it('only accepts captions stored under the user’s own folder', async () => {
    const { service } = setup();
    await expect(
      service.create('u1', body({ captions: { key: 'u2/captions/x.srt', language: 'en', filename: 'x.srt' } }))
    ).rejects.toHaveProperty('fields.captions');
  });

  it('refuses a publish time in the past or too soon', async () => {
    const { service } = setup();
    await expect(service.create('u1', body({ scheduledDate: '2026-10-20', scheduledTime: '13:10' }))).rejects.toHaveProperty(
      'fields.scheduledTime'
    );
  });

  it('refuses scheduling the same upload twice', async () => {
    const { service } = setup({ existing: { videoId: 'v0' } });
    await expect(service.create('u1', body())).rejects.toMatchObject({ code: 'ALREADY_SCHEDULED', statusCode: 409 });
  });

  it('has no publish time when publishing now', async () => {
    const { service } = setup();
    const video = await service.create('u1', body({ publishMode: 'now', scheduledDate: undefined, scheduledTime: undefined, timeZone: undefined }));
    expect(video.publishAt).toBeUndefined();
  });
});
