/**
 * YouTube research for a video's details: real search results become keyword
 * and tag suggestions with scores; the AI then writes titles and a
 * description around them, and anything it writes is checked before use.
 *
 * YouTube search costs 100 quota units a call (videos.list 1), so results are
 * cached for 24 hours and research stops for the day at a set budget, leaving
 * the rest of the quota for uploads.
 */

import { getYouTubeAccess } from './youtubeAccess';
import { searchTopVideos } from './youtubeClient';
import { TranscriptService } from './transcriptService';
import { getVideoInsightsAgent } from './container';
import { channelSearches, type ChannelSearches } from './channelSearchService';
import {
  relatedTo,
  groundedIn,
  normalize,
  scoreDescription,
  scoreKeyword,
  scoreTags,
  scoreTitle,
  type Check,
  type KeywordInsight,
  type TagInsight,
  type TopVideo,
} from '@/lib/youtube/research';
import type { ResearchRequest } from '@/lib/models/videoInsights';
import type { Transcript } from '@/types/media';

const CACHE_MS = 24 * 60 * 60 * 1000;
const SEARCH_UNITS = 101; // search.list + videos.list
const SEARCHES_PER_RESEARCH = 3;
const DAILY_BUDGET = Number(process.env.YOUTUBE_RESEARCH_DAILY_UNITS || 6000);

const cache = new Map<string, { at: number; videos: TopVideo[] }>();
let usage = { day: '', units: 0 };

export class ResearchError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'ResearchError';
  }
}

export interface ResearchResult {
  keywords: KeywordInsight[];
  tags: TagInsight[];
  /** Where the phrases came from: the video's speech, its title, or both */
  basedOn: 'transcript' | 'title' | 'both';
  /** Searches that already bring viewers to the channel, marked when related to this video */
  channel:
    | { available: true; terms: { term: string; views: number; related: boolean }[] }
    | { available: false; reason: 'no_permission' | 'not_enabled' | 'unavailable' };
}

export interface ScoredTitle {
  text: string;
  score: number;
  checks: Check[];
}

export interface WrittenResult {
  titles: ScoredTitle[];
  description: { text: string; score: number; checks: Check[] } | null;
}

function spend(units: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (usage.day !== today) usage = { day: today, units: 0 };
  if (usage.units + units > DAILY_BUDGET) return false;
  usage.units += units;
  return true;
}

/** For tests */
export function resetResearchCache() {
  cache.clear();
  usage = { day: '', units: 0 };
}

/** The transcript as plain text, trimmed to a size the AI handles quickly */
function transcriptText(transcript: Transcript | null, maxChars = 30_000): string {
  return transcript ? transcript.segments.map((s) => s.text).join(' ').slice(0, maxChars) : '';
}

export class YouTubeResearchService {
  constructor(
    private deps: {
      access?: typeof getYouTubeAccess;
      search?: typeof searchTopVideos;
      transcripts?: Pick<TranscriptService, 'get'>;
      channel?: (userId: string) => Promise<ChannelSearches>;
      agent?: ReturnType<typeof getVideoInsightsAgent>;
    } = {}
  ) {}

  private get agent() {
    return this.deps.agent ?? getVideoInsightsAgent();
  }

  private async transcript(userId: string, mediaId?: string): Promise<Transcript | null> {
    if (!mediaId) return null;
    try {
      return await (this.deps.transcripts ?? new TranscriptService()).get(userId, mediaId);
    } catch {
      return null;
    }
  }

  private async topVideos(accessToken: string, phrase: string, region: string, language: string): Promise<TopVideo[]> {
    const key = `${normalize(phrase)}|${region}|${language}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.videos;
    if (!spend(SEARCH_UNITS)) {
      throw new ResearchError('Zetca has used today’s YouTube research allowance. Try again tomorrow.', 429);
    }
    const videos = await (this.deps.search ?? searchTopVideos)(accessToken, phrase, { regionCode: region, language });
    cache.set(key, { at: Date.now(), videos });
    return videos;
  }

  /** Search phrases from the video, scored against what ranks on YouTube now */
  async research(userId: string, req: ResearchRequest): Promise<ResearchResult> {
    const transcript = await this.transcript(userId, req.mediaId);
    const spoken = transcriptText(transcript);
    if (!req.title.trim() && !spoken) {
      throw new ResearchError('Add a title first, or wait for Zetca to finish listening to the video.');
    }

    // Phrases must use words from the title or transcript, so none are invented
    const source = `${req.title} ${spoken}`;
    const phrases = (await this.agent.topics(req.title, spoken))
      .map((p) => normalize(p))
      .filter((p, i, all) => p.split(' ').length >= 1 && p.split(' ').length <= 6 && all.indexOf(p) === i)
      .filter((p) => groundedIn(p, source))
      .slice(0, SEARCHES_PER_RESEARCH);
    if (!phrases.length && req.title.trim()) phrases.push(normalize(req.title).split(' ').slice(0, 5).join(' '));

    // A search that already brings this channel viewers and fits this video is the strongest keyword
    const channel = await (this.deps.channel ?? channelSearches)(userId).catch(
      (): ChannelSearches => ({ available: false, reason: 'unavailable' })
    );
    const channelTerms = channel.available
      ? channel.terms.map((t) => ({ ...t, related: relatedTo(t.term, source) }))
      : [];
    const best = channelTerms.find((t) => t.related && !phrases.includes(normalize(t.term)));
    if (best) {
      if (phrases.length >= SEARCHES_PER_RESEARCH) phrases.pop();
      phrases.unshift(normalize(best.term));
    }
    if (!phrases.length) throw new ResearchError('Couldn’t find search phrases in this video.');

    const { accessToken } = await (this.deps.access ?? getYouTubeAccess)(userId);
    const results = await Promise.all(phrases.map((p) => this.topVideos(accessToken, p, req.region, req.language)));

    const viewsFor = new Map(channelTerms.map((t) => [normalize(t.term), t.views]));
    const keywords = phrases
      .map((p, i) => {
        const k = scoreKeyword(p, results[i]);
        return viewsFor.has(p) ? { ...k, channelViews: viewsFor.get(p) } : k;
      })
      .filter((k) => k.sampleSize > 0)
      .sort((a, b) => b.score - a.score);
    const tags = scoreTags(results.flat());

    const inTitle = phrases.some((p) => groundedIn(p, req.title));
    const inSpeech = phrases.some((p) => groundedIn(p, spoken));
    return {
      keywords,
      tags,
      basedOn: inTitle && inSpeech ? 'both' : inSpeech ? 'transcript' : 'title',
      channel: channel.available
        ? {
            available: true,
            // Related searches first, then the channel's other top searches
            terms: [...channelTerms.filter((t) => t.related), ...channelTerms.filter((t) => !t.related)].slice(0, 10),
          }
        : channel,
    };
  }

  /** Titles and a description written around researched keywords, each scored */
  async write(
    userId: string,
    req: ResearchRequest & { keywords: KeywordInsight[]; chaptersOk: boolean | null }
  ): Promise<WrittenResult> {
    if (!req.keywords.length) throw new ResearchError('Get keyword suggestions first.');
    const transcript = await this.transcript(userId, req.mediaId);
    const written = await this.agent.write({
      title: req.title,
      transcript: transcriptText(transcript, 20_000),
      keywords: req.keywords.map((k) => ({ phrase: k.phrase, score: k.score })),
      language: req.language,
      isShort: req.isShort,
    });

    // Keep only titles that really use a researched phrase and fit YouTube's rules
    const titles = written.titles
      .map((t) => t.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim())
      .filter((t, i, all) => t && t.length <= 100 && all.indexOf(t) === i)
      .filter((t) => req.keywords.some((k) => normalize(t).includes(normalize(k.phrase))))
      .map((text) => ({ text, ...scoreTitle(text, req.keywords) }))
      .sort((a, b) => b.score - a.score);

    const text = written.description.replace(/[<>]/g, '').trim().slice(0, 4800);
    const description = text ? { text, ...scoreDescription(text, req.keywords, req.chaptersOk) } : null;
    return { titles, description };
  }
}
