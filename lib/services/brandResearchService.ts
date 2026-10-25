/**
 * Talk to Zetca's research: from the user's message, read their website and
 * social profiles, search the public web for them, then build a brand
 * profile and brand kit.
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
import type { BrandResearchInput } from '../research/brandProfile';
import type { BrandProfile, BrandResearch, Finding, ResearchStep, ResearchStepId } from '../models/brandResearch';
import { SOCIAL_HOSTS, linksIn, readPage, WebReadError, type PageRead, type SocialPlatform } from '../research/webReader';
import { WebSearch, type SearchResult } from '../research/webSearch';

export interface ProfileWriter {
  profile(input: BrandResearchInput): Promise<BrandProfile>;
}

const key = (userId: string, id: string) => `research/${userId}/${id}.json`;
const ID = /^[0-9a-f-]{36}$/;

export class ResearchNotFoundError extends Error {
  statusCode = 404;
  constructor() {
    super('That research doesn’t exist');
  }
}

const STEPS: { id: ResearchStepId; label: string }[] = [
  { id: 'links', label: 'Reading your message' },
  { id: 'website', label: 'Looking at your website' },
  { id: 'web', label: 'Searching for you online' },
  { id: 'profile', label: 'Putting your brand together' },
];

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

const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export class BrandResearchService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private writer: ProfileWriter,
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
        findings: [],
        socials: {},
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
    const found = (f: Finding) => (r = { ...r, findings: [...r.findings, f] });

    // 1. Links in the message: their website, and any social profiles
    await step('links', { status: 'working' });
    const links = linksIn(r.message);
    const socials: BrandResearch['socials'] = {};
    let website: string | undefined;
    for (const l of links) {
      const p = platformOf(l);
      if (p) socials[p] ??= l;
      else website ??= l;
    }
    await step('links', { status: 'done', detail: links.length ? `${links.length} ${links.length === 1 ? 'link' : 'links'}` : 'No links, so I’ll search for you' }, { socials });

    // 2. The website: home page, plus about/services pages
    const pages: PageRead[] = [];
    if (website) {
      await step('website', { status: 'working', detail: shortUrl(website) });
      try {
        const home = await this.read(website);
        pages.push(home);
        found({ kind: 'site', title: home.title || shortUrl(home.url), text: home.description || home.headings.slice(0, 2).join(' · '), source: home.url });
        for (const more of home.morePages.slice(0, 2)) {
          const page = await this.read(more, { withStyles: false }).catch(() => null);
          if (page) pages.push(page);
        }
        for (const [p, url] of Object.entries(home.socials) as [SocialPlatform, string][]) socials[p] ??= url;
        await step('website', { status: 'done', detail: `${pages.length} ${pages.length === 1 ? 'page' : 'pages'} read` }, { socials });
      } catch (error) {
        const why = error instanceof WebReadError ? error.message : `I couldn’t open ${shortUrl(website)}`;
        await step('website', { status: 'failed', detail: why });
      }
    } else {
      await step('website', { status: 'skipped', detail: 'No website link' });
    }

    // Public social profiles that show something without logging in (YouTube, X)
    const socialPages: PageRead[] = [];
    for (const [p, url] of Object.entries(socials) as [SocialPlatform, string][]) {
      if (LOGIN_WALLED.includes(p)) continue;
      const page = await this.read(url, { withStyles: false }).catch(() => null);
      if (page) socialPages.push(page);
    }

    // 3. The public web
    const results: SearchResult[] = [];
    if (this.search.available) {
      await step('web', { status: 'working' });
      const name = (pages[0]?.title.split(/\s[-|–·:]\s/)[0] ?? '').trim();
      const queries = name ? [`"${name}"`, `${name} reviews`] : [r.message.replace(/https?:\/\/\S+/g, '').slice(0, 200)];
      for (const q of queries) {
        const hits = await this.search.search(q, { maxResults: 5, excludeDomains: website ? [new URL(website).hostname] : [] }).catch(() => []);
        for (const h of hits) if (!results.some((x) => x.url === h.url)) results.push(h);
      }
      for (const h of results) {
        const p = platformOf(h.url);
        if (p && name && h.title.toLowerCase().includes(name.toLowerCase().split(' ')[0])) socials[p] ??= h.url;
      }
      for (const h of results.slice(0, 3)) found({ kind: 'web', title: h.title, text: h.content.slice(0, 180), source: h.url });
      await step('web', { status: 'done', detail: `${results.length} results` }, { socials });
    } else {
      await step('web', { status: 'skipped', detail: 'Web search isn’t set up' });
    }

    // 4. The brand profile and brand kit
    await step('profile', { status: 'working' });
    const profile = await this.writer.profile({ message: r.message, pages, socialPages, search: results });
    await step('profile', { status: 'done' }, { profile, status: 'done' });
    return r;
  }
}
