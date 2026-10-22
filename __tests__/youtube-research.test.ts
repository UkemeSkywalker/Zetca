/**
 * @jest-environment node
 */

jest.mock('@/lib/services/container', () => ({ getVideoInsightsAgent: () => ({}) }));

import {
  demandScore,
  groundedIn,
  median,
  scoreDescription,
  scoreKeyword,
  scoreTags,
  scoreTitle,
  type TopVideo,
} from '@/lib/youtube/research';
import { YouTubeResearchService, resetResearchCache } from '@/lib/services/youtubeResearchService';

const NOW = new Date('2026-10-22T12:00:00Z');
const video = (patch: Partial<TopVideo>): TopVideo => ({
  id: Math.random().toString(36).slice(2),
  title: 'Something else',
  views: 1000,
  publishedAt: '2026-09-01T00:00:00Z',
  tags: [],
  channelTitle: 'c',
  ...patch,
});

describe('scores from YouTube results', () => {
  it('uses medians and a log scale for demand', () => {
    expect(median([1, 9, 3])).toBe(3);
    expect(demandScore(0)).toBe(0);
    expect(demandScore(3_000_000)).toBe(100);
    expect(demandScore(100_000)).toBe(77);
  });

  it('scores a keyword from demand, freshness and competition', () => {
    const results = [
      video({ title: 'Home workout for beginners', views: 2_000_000 }),
      video({ title: 'HOME WORKOUT for beginners!', views: 900_000, publishedAt: '2020-01-01T00:00:00Z' }),
      video({ title: 'Quick routine', views: 40_000 }),
    ];
    const k = scoreKeyword('home workout for beginners', results, NOW);
    expect(k).toMatchObject({ medianViews: 900_000, recentCount: 2, strongCompetitors: 2, sampleSize: 3 });
    expect(k.score).toBeGreaterThan(50);
    expect(k.score).toBeLessThan(90);
  });

  it('suggests only tags at least two top videos use', () => {
    const tags = scoreTags([
      video({ tags: ['Workout', 'home'], views: 500_000 }),
      video({ tags: ['workout', 'gym'], views: 100_000 }),
      video({ tags: ['yoga'] }),
    ]);
    expect(tags.map((t) => t.tag)).toEqual(['workout']);
    expect(tags[0]).toMatchObject({ usedBy: 2, sampleSize: 3, medianViews: 300_000 });
  });

  it('only accepts phrases made of words from the source', () => {
    expect(groundedIn('home workout', 'A quick Home-Workout today')).toBe(true);
    expect(groundedIn('netflix series', 'A quick home workout')).toBe(false);
  });

  const keywords = [
    { phrase: 'home workout', score: 80, medianViews: 1, recentCount: 1, strongCompetitors: 1, sampleSize: 20 },
    { phrase: 'beginner squats', score: 50, medianViews: 1, recentCount: 1, strongCompetitors: 1, sampleSize: 20 },
  ];

  it('scores titles by checks anyone can see', () => {
    const good = scoreTitle('Home Workout for Beginners: 15 Minutes, No Equipment', keywords);
    const bad = scoreTitle('MY ROUTINE!!!', keywords);
    expect(good.checks.every((c) => c.ok)).toBe(true);
    expect(good.score).toBeGreaterThan(bad.score);
    expect(bad.checks.find((c) => c.label.includes('ALL-CAPS'))?.ok).toBe(false);
  });

  it('scores descriptions on the opening, keyword use, length and chapters', () => {
    const text = `Home workout you can do anywhere. ${'Great for beginner squats. '.repeat(10)}`;
    const s = scoreDescription(text, keywords, true);
    expect(s.score).toBe(100);
    expect(scoreDescription('Short.', keywords, null).score).toBe(0);
  });
});

describe('YouTubeResearchService', () => {

  const agent = {
    topics: jest.fn(async () => ['home workout', 'netflix series', 'beginner squats']),
    write: jest.fn(async () => ({
      titles: ['Home Workout for Beginners: No Equipment', 'A title with no search phrase', 'Home Workout for Beginners: No Equipment'],
      description: 'Home workout for everyone. <b>Bold</b> claims removed.',
    })),
  };
  const search = jest.fn(async (_t: string, q: string) => [
    video({ title: `${q} guide`, views: 300_000, tags: ['fitness', 'workout'] }),
    video({ title: 'other', views: 50_000, tags: ['fitness'] }),
  ]);
  beforeEach(() => {
    resetResearchCache();
    search.mockClear();
  });

  const service = () =>
    new YouTubeResearchService({
      access: async () => ({ accessToken: 't', channelId: 'UC1' }),
      search,
      transcripts: { get: async () => ({ language: 'en-US', segments: [{ start: 0, end: 5, text: 'Today a home workout with beginner squats.' }] }) },
      agent: agent as never,
      channel: async () => ({ available: false, reason: 'no_permission' }),
    });

  it('drops phrases not in the video, and scores the rest from YouTube', async () => {
    const out = await service().research('u1', { title: 'Workout', mediaId: '11111111-1111-4111-8111-111111111111', region: 'NG', language: 'en', isShort: false });
    expect(out.keywords.map((k) => k.phrase).sort()).toEqual(['beginner squats', 'home workout']);
    expect(search).toHaveBeenCalledTimes(2);
    expect(out.tags.map((t) => t.tag)).toContain('fitness');
    expect(out.basedOn).toBe('transcript');
  });

  it('serves repeat searches from the cache', async () => {
    const s = service();
    const req = { title: 'Workout', mediaId: '11111111-1111-4111-8111-111111111111', region: 'NG', language: 'en', isShort: false };
    await s.research('u1', req);
    await s.research('u1', req);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it('keeps only titles that use a researched phrase, and cleans the description', async () => {
    const keywords = [{ phrase: 'home workout', score: 80, medianViews: 1, recentCount: 1, strongCompetitors: 1, sampleSize: 2 }];
    const out = await service().write('u1', { title: '', region: 'NG', language: 'en', isShort: false, keywords, chaptersOk: null });
    expect(out.titles.map((t) => t.text)).toEqual(['Home Workout for Beginners: No Equipment']);
    expect(out.description?.text).not.toMatch(/[<>]/);
  });
});

describe('channel searches in research', () => {
  beforeEach(() => resetResearchCache());

  it('puts a related search that already brings the channel viewers first, with its views', async () => {
    const service = new YouTubeResearchService({
      access: async () => ({ accessToken: 't', channelId: 'UC1' }),
      search: jest.fn(async (_t: string, q: string) => [video({ title: q, views: 100_000 })]),
      transcripts: { get: async () => ({ language: 'en-US', segments: [{ start: 0, end: 5, text: 'Today a home workout with beginner squats.' }] }) },
      agent: { topics: async () => ['home workout', 'beginner squats'], write: async () => ({ titles: [], description: '' }) } as never,
      channel: async () => ({
        available: true,
        terms: [
          { term: 'cooking pasta', views: 900 },
          { term: 'squats at home for women', views: 420 },
        ],
      }),
    });
    const out = await service.research('u1', { title: 'Workout', mediaId: '11111111-1111-4111-8111-111111111111', region: 'NG', language: 'en', isShort: false });
    const fromChannel = out.keywords.find((k) => k.channelViews !== undefined);
    expect(fromChannel).toMatchObject({ phrase: 'squats at home for women', channelViews: 420 });
    expect(out.channel).toEqual({
      available: true,
      terms: [
        { term: 'squats at home for women', views: 420, related: true },
        { term: 'cooking pasta', views: 900, related: false },
      ],
    });
  });
});
