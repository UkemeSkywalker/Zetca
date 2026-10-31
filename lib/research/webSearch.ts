/**
 * Searching the public web for brand research, with Tavily
 * (https://docs.tavily.com). Its free plan is 1,000 searches a month, so
 * results are kept for a day and a repeat search costs nothing.
 */

import { getConfig } from '../config';

export interface SearchResult {
  title: string;
  url: string;
  /** Tavily's summary of the page's most relevant part */
  content: string;
}

export interface SearchImage {
  url: string;
  /** Often the post's caption or the page's title */
  title?: string;
  description?: string;
}

export interface SearchFound {
  results: SearchResult[];
  images: SearchImage[];
}

export class WebSearchError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'WebSearchError';
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; found: SearchFound }>();

export type SearchPost = (body: Record<string, unknown>, key: string) => Promise<{ status: number; json: unknown }>;

const post: SearchPost = async (body, key) => {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
};

export class WebSearch {
  constructor(private send: SearchPost = post) {}

  get available(): boolean {
    return !!getConfig().tavilyApiKey;
  }

  async search(query: string, opts: { maxResults?: number; excludeDomains?: string[] } = {}): Promise<SearchResult[]> {
    return (await this.find(query, opts)).results;
  }

  /** Search results, plus images when `images` is set (same 1 search) */
  async find(query: string, { maxResults = 5, excludeDomains = [] as string[], images = false } = {}): Promise<SearchFound> {
    const key = getConfig().tavilyApiKey;
    if (!key) throw new WebSearchError('Web search isn’t set up', 503);
    const q = query.trim().slice(0, 380);
    const cacheKey = `${q}|${maxResults}|${excludeDomains.join(',')}|${images}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < DAY_MS) return hit.found;

    const { status, json } = await this.send(
      {
        query: q,
        max_results: maxResults,
        search_depth: 'basic',
        ...(excludeDomains.length ? { exclude_domains: excludeDomains } : {}),
        ...(images ? { include_images: true, include_image_descriptions: true } : {}),
      },
      key
    ).catch(() => {
      throw new WebSearchError('Web search didn’t answer. Try again in a moment.');
    });
    if (status === 429 || status === 432 || status === 433) throw new WebSearchError('Web search has hit its limit for now. Try again later.', 429);
    if (status !== 200) throw new WebSearchError(`Web search failed (${status})`);
    const body = json as { results?: { title?: string; url?: string; content?: string }[]; images?: (string | { url?: string; title?: string; description?: string })[] };
    const results = (body.results ?? [])
      .filter((r) => r.url)
      .map((r) => ({ title: (r.title ?? '').trim(), url: r.url!, content: (r.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 700) }));
    const found: SearchFound = {
      results,
      images: (body.images ?? [])
        .map((i) => (typeof i === 'string' ? { url: i } : { url: i.url ?? '', title: i.title?.trim(), description: i.description?.trim() }))
        .filter((i) => /^https:\/\//.test(i.url))
        .slice(0, 10),
    };
    cache.set(cacheKey, { at: Date.now(), found });
    if (cache.size > 500) cache.delete(cache.keys().next().value!);
    return found;
  }
}
