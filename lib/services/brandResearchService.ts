/**
 * Talk to Zetca's research: from the user's message, read their website,
 * search the public web for them (text, photos and videos), build a brand
 * profile and brand kit, then find 2-3 similar brands and compare.
 *
 * It runs in the background after the request returns; each step is saved
 * as it finishes so the page can show findings as they arrive. Research is a
 * small JSON file per run in the media bucket. Credits are taken at the start
 * and given back if it fails.
 */

import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getConfig } from '../config';
import { charge, priceOf } from '../billing/charge';
import type { BrandResearchInput, CompetitorMaterial } from '../research/brandProfile';
import type {
  BrandProfile,
  BrandResearch,
  Comparison,
  CompetitorFound,
  CompetitorPicks,
  Media,
  MediaImage,
  ResearchStep,
  ResearchStepId,
  Socials,
} from '../models/brandResearch';
import { SOCIAL_HOSTS, linksIn, readPage, videoFrom, WebReadError, type PageRead, type SocialPlatform } from '../research/webReader';
import { WebSearch, type SearchFound, type SearchImage, type SearchResult } from '../research/webSearch';

export interface ResearchWriter {
  profile(input: BrandResearchInput): Promise<BrandProfile>;
  pickCompetitors(profile: BrandProfile, results: SearchResult[], ownSite?: string): Promise<CompetitorPicks>;
  compare(profile: BrandProfile, competitors: CompetitorMaterial[]): Promise<Comparison>;
}

const key = (userId: string, id: string) => `research/${userId}/${id}.json`;
const ID = /^[0-9a-f-]{36}$/;

export class ResearchNotFoundError extends Error {
  statusCode = 404;
  constructor() {
    super('That research doesn’t exist');
  }
}

export const STEPS: { id: ResearchStepId; label: string }[] = [
  { id: 'website', label: 'Your website' },
  { id: 'web', label: 'You online' },
  { id: 'profile', label: 'Your brand' },
  { id: 'competitors', label: 'Brands like yours' },
  { id: 'compare', label: 'What works' },
];

const MAX_IMAGES = 12;
const MAX_VIDEOS = 6;

/** Social sites that show only a login page to visitors */
const LOGIN_WALLED: SocialPlatform[] = ['instagram', 'tiktok', 'linkedin', 'facebook'];

export const platformOf = (url: string): SocialPlatform | null => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return (Object.entries(SOCIAL_HOSTS) as [SocialPlatform, RegExp][]).find(([, re]) => re.test(host))?.[0] ?? null;
  } catch {
    return null;
  }
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

/** The words in a brand name worth matching on ("Bespoke Bakeries" → bespoke, bakeries) */
const nameWords = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !['the', 'and', 'ltd', 'limited', 'inc', 'company'].includes(w));

/** Search images that are clearly of this brand: its name or website in the image's address or caption */
export function imagesOfBrand(images: SearchImage[], name: string, site?: string): MediaImage[] {
  const words = nameWords(name);
  const siteHost = site ? hostOf(site).split('.')[0] : '';
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const needle = squash(name);
  return images
    .filter((i) => {
      const caption = `${i.title ?? ''} ${i.description ?? ''}`.toLowerCase();
      const onTheirSite = !!siteHost && hostOf(i.url).includes(siteHost);
      const named = (needle.length > 3 && squash(`${i.url} ${caption}`).includes(needle)) || (words.length > 1 && words.every((w) => caption.includes(w)));
      // Instagram post images carry the caption; elsewhere the photo must be on their site or carry their name in its address
      if (/lookaside\.instagram|cdninstagram/.test(i.url)) return named;
      return onTheirSite || (needle.length > 3 && squash(i.url).includes(needle));
    })
    .map((i) => ({
      url: i.url,
      source: /lookaside\.instagram|cdninstagram/.test(i.url) ? 'https://www.instagram.com' : `https://${hostOf(i.url)}`,
      caption: (i.title || i.description)?.slice(0, 120),
    }));
}

const emptyMedia = (): Media => ({ images: [], videos: [] });

function addMedia(media: Media, pages: PageRead[], extra: MediaImage[] = []): Media {
  const images = [...media.images];
  const videos = [...media.videos];
  for (const p of pages) {
    for (const i of p.images) if (!images.some((x) => x.url === i.url)) images.push({ url: i.url, source: p.url, caption: i.alt });
    for (const v of p.videos) if (!videos.some((x) => x.url === v.url)) videos.push({ ...v, source: p.url });
  }
  for (const i of extra) if (!images.some((x) => x.url === i.url)) images.push(i);
  return { images: images.slice(0, MAX_IMAGES), videos: videos.slice(0, MAX_VIDEOS) };
}

/** Videos among search results (YouTube, TikTok, Instagram Reels) */
function videosIn(results: SearchResult[], media: Media): Media {
  const videos = [...media.videos];
  for (const r of results) {
    const v = videoFrom(r.url);
    if (v && !videos.some((x) => x.url === v.url)) videos.push({ ...v, source: r.url });
  }
  return { ...media, videos: videos.slice(0, MAX_VIDEOS) };
}

const socialsFrom = (into: Socials, results: SearchResult[], name: string): Socials => {
  const out = { ...into };
  const first = nameWords(name)[0];
  for (const r of results) {
    const p = platformOf(r.url);
    if (p && first && `${r.title} ${r.url}`.toLowerCase().includes(first)) out[p] ??= r.url;
  }
  return out;
};

export class BrandResearchService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private writer: ResearchWriter,
    private search = new WebSearch(),
    s3?: S3Client,
    private read: typeof readPage = readPage
  ) {
    const cfg = getConfig();
    const s3Config: S3ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    this.s3 = s3 ?? new S3Client(s3Config);
    this.bucket = cfg.s3MediaBucket;
  }

  private async save(r: BrandResearch): Promise<BrandResearch> {
    const next = { ...r, updatedAt: new Date().toISOString() };
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: key(r.userId, r.researchId), Body: JSON.stringify(next), ContentType: 'application/json' }));
    return next;
  }

  async get(userId: string, researchId: string): Promise<BrandResearch> {
    if (!ID.test(researchId)) throw new ResearchNotFoundError();
    try {
      const out = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key(userId, researchId) }));
      return JSON.parse(await out.Body!.transformToString()) as BrandResearch;
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') throw new ResearchNotFoundError();
      throw error;
    }
  }

  /** Takes the credits, saves the research and starts it; returns straight away */
  async start(userId: string, message: string): Promise<BrandResearch> {
    const cost = priceOf('brand_research');
    const paid = await charge(userId, 'brand_research', cost);
    const now = new Date().toISOString();
    let research: BrandResearch;
    try {
      research = await this.save({
        researchId: randomUUID(),
        userId,
        message,
        status: 'working',
        steps: STEPS.map((s) => ({ ...s, status: 'waiting' })),
        socials: {},
        media: emptyMedia(),
        chips: [],
        competitors: [],
        cost,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      await paid.fail();
      throw error;
    }
    void paid
      .run(() => this.run(research))
      .then(() => paid.done())
      .catch(async (error: Error) => {
        await paid.fail();
        console.error('Brand research failed:', error.message);
        const latest = await this.get(userId, research.researchId).catch(() => research);
        await this.save({
          ...latest,
          status: 'failed',
          steps: latest.steps.map((s) => (s.status === 'working' ? { ...s, status: 'failed' } : s)),
          error: 'Something went wrong while researching. Your credits were given back. Try again?',
        }).catch(() => undefined);
      });
    return research;
  }

  /** The research itself; saves after every step */
  async run(start: BrandResearch): Promise<BrandResearch> {
    let r = start;
    const step = async (id: ResearchStepId, change: Partial<ResearchStep>, more: Partial<BrandResearch> = {}) => {
      r = await this.save({ ...r, ...more, steps: r.steps.map((s) => (s.id === id ? { ...s, ...change } : s)) });
    };
    const find = (q: string, opts: { maxResults?: number; excludeDomains?: string[]; images?: boolean } = {}): Promise<SearchFound> =>
      this.search.available ? this.search.find(q, opts).catch(() => ({ results: [], images: [] })) : Promise.resolve({ results: [], images: [] });

    // Links in the message: their website, and any social profiles
    const links = linksIn(r.message);
    let socials: Socials = {};
    let website: string | undefined;
    for (const l of links) {
      const p = platformOf(l);
      if (p) socials[p] ??= l;
      else website ??= l;
    }

    // 1. The website: home page, plus about/services pages
    const pages: PageRead[] = [];
    if (website) {
      await step('website', { status: 'working', detail: shortUrl(website) }, { socials });
      try {
        const home = await this.read(website);
        pages.push(home);
        for (const more of home.morePages.slice(0, 2)) {
          const page = await this.read(more, { withStyles: false }).catch(() => null);
          if (page) pages.push(page);
        }
        for (const [p, url] of Object.entries(home.socials) as [SocialPlatform, string][]) socials[p] ??= url;
        const chips = home.headings.filter((h) => h.split(/\s+/).length <= 4).slice(0, 5);
        await step('website', { status: 'done', detail: `${pages.length} ${pages.length === 1 ? 'page' : 'pages'}` }, { socials, media: addMedia(r.media, pages), chips });
      } catch (error) {
        const why = error instanceof WebReadError ? error.message : `I couldn’t open ${shortUrl(website)}`;
        await step('website', { status: 'failed', detail: why });
      }
    } else {
      await step('website', { status: 'skipped', detail: 'No link' });
    }

    // Public social profiles that show something without logging in (YouTube, X)
    const socialPages: PageRead[] = [];
    for (const [p, url] of Object.entries(socials) as [SocialPlatform, string][]) {
      if (LOGIN_WALLED.includes(p)) continue;
      const page = await this.read(url, { withStyles: false }).catch(() => null);
      if (page) socialPages.push(page);
    }

    // 2. The public web: about them, with photos and videos
    const results: SearchResult[] = [];
    const name = (pages[0]?.title.split(/\s[-|–·:]\s/)[0] ?? '').trim();
    if (this.search.available) {
      await step('web', { status: 'working' });
      const own = website ? [hostOf(website)] : [];
      const queries = name ? [`"${name}"`, `${name} reviews`] : [r.message.replace(/https?:\/\/\S+/g, '').slice(0, 200)];
      let images: MediaImage[] = [];
      for (const [i, q] of queries.entries()) {
        const found = await find(q, { maxResults: 5, excludeDomains: own, images: i === 0 });
        for (const h of found.results) if (!results.some((x) => x.url === h.url)) results.push(h);
        if (name) images = [...images, ...imagesOfBrand(found.images, name, website)];
      }
      socials = name ? socialsFrom(socials, results, name) : socials;
      await step('web', { status: 'done', detail: `${results.length} results` }, { socials, media: videosIn(results, addMedia(r.media, [], images)) });
    } else {
      await step('web', { status: 'skipped', detail: 'Search isn’t set up' });
    }

    // 3. The brand profile and brand kit
    await step('profile', { status: 'working' });
    const profile = await this.writer.profile({ message: r.message, pages, socialPages, search: results });
    await step('profile', { status: 'done' }, { profile, chips: [...profile.offerings, ...(profile.location ? [profile.location] : [])].slice(0, 6) });

    // 4. Brands like yours
    if (!this.search.available) {
      await step('competitors', { status: 'skipped', detail: 'Search isn’t set up' });
      await step('compare', { status: 'skipped' }, { status: 'done' });
      return r;
    }
    await step('competitors', { status: 'working' });
    const where = profile.location ? ` in ${profile.location}` : '';
    const exclude = website ? [hostOf(website)] : [];
    const candidates: SearchResult[] = [];
    for (const q of [`${profile.category}${where}`, `best ${profile.category}${where}`]) {
      const found = await find(q, { maxResults: 8, excludeDomains: exclude });
      for (const h of found.results) if (!candidates.some((x) => x.url === h.url)) candidates.push(h);
    }
    const picks = candidates.length ? (await this.writer.pickCompetitors(profile, candidates, website)).competitors : [];
    const own = nameWords(profile.brandName).join(' ');
    const chosen = picks.filter((p) => nameWords(p.name).join(' ') !== own && (!website || !p.website || hostOf(p.website) !== hostOf(website))).slice(0, 3);

    const material: CompetitorMaterial[] = [];
    const competitors: CompetitorFound[] = await Promise.all(
      chosen.map(async (pick) => {
        const site = pick.website && !platformOf(pick.website) ? pick.website : undefined;
        const page = site ? await this.read(site).catch(() => null) : null;
        const found = await find(`${pick.name}${where}`, { maxResults: 4, images: true });
        let cSocials: Socials = { ...(page?.socials ?? {}) };
        const pickPlatform = pick.social ? platformOf(pick.social) : null;
        if (pick.social && pickPlatform) cSocials[pickPlatform] ??= pick.social;
        cSocials = socialsFrom(cSocials, found.results, pick.name);
        material.push({ name: pick.name, why: pick.why, pages: page ? [page] : [], search: found.results });
        return {
          name: pick.name,
          why: pick.why,
          website: page?.url ?? site,
          socials: cSocials,
          logoUrl: page?.logos[0],
          colors: page?.colors.slice(0, 4) ?? [],
          media: videosIn(found.results, addMedia(emptyMedia(), page ? [page] : [], imagesOfBrand(found.images, pick.name, site))),
        };
      })
    );
    await step('competitors', { status: competitors.length ? 'done' : 'skipped', detail: competitors.length ? `${competitors.length} found` : 'None found' }, { competitors });

    // 5. What works for them, and where the user can win
    if (!competitors.length) {
      await step('compare', { status: 'skipped' }, { status: 'done' });
      return r;
    }
    await step('compare', { status: 'working' });
    const comparison = await this.writer.compare(profile, material);
    const merged = competitors.map((c) => {
      const m = comparison.competitors.find((x) => x.name.toLowerCase() === c.name.toLowerCase());
      return m ? { ...c, positioning: m.positioning, contentStyle: m.contentStyle, offers: m.offers } : c;
    });
    await step(
      'compare',
      { status: 'done' },
      { competitors: merged, comparison: { whatWorks: comparison.whatWorks, gap: comparison.gap, positioning: comparison.positioning }, status: 'done' }
    );
    return r;
  }
}
