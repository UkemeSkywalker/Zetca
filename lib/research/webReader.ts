/**
 * Reads a public web page for brand research: its words, logo, colours,
 * fonts and links to the brand's social profiles.
 *
 * Links come from users, so every fetch (and every redirect) is checked to
 * point at a public internet address, never at the server's own network.
 */

import { lookup } from 'dns/promises';
import { isIP } from 'net';
import { parse, type HTMLElement } from 'node-html-parser';

export const SOCIAL_HOSTS = {
  instagram: /(^|\.)instagram\.com$/,
  tiktok: /(^|\.)tiktok\.com$/,
  linkedin: /(^|\.)linkedin\.com$/,
  x: /(^|\.)(x|twitter)\.com$/,
  facebook: /(^|\.)(facebook|fb)\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/,
} as const;
export type SocialPlatform = keyof typeof SOCIAL_HOSTS;

export interface PageRead {
  url: string;
  title: string;
  description: string;
  /** Headings, top to bottom */
  headings: string[];
  /** The readable words on the page, trimmed */
  text: string;
  /** Possible logos, best first */
  logos: string[];
  /** Hex colours used on the page, most used first */
  colors: string[];
  /** Font families named on the page or its stylesheets */
  fonts: string[];
  /** The brand's social profiles linked from the page */
  socials: Partial<Record<SocialPlatform, string>>;
  /** Same-site pages worth reading next (about, services, menu…) */
  morePages: string[];
}

export class WebReadError extends Error {
  constructor(message: string, public url: string) {
    super(message);
    this.name = 'WebReadError';
  }
}

const MAX_BYTES = 2_000_000;
const MAX_TEXT = 6000;
const TIMEOUT_MS = 12_000;
const UA = 'Mozilla/5.0 (compatible; ZetcaBot/1.0; +https://zetca.pro)';

/** Turns "crumbandco.ng" or "www.x.com/y" into a full https URL */
export function normaliseUrl(input: string): string {
  const raw = input.trim().replace(/[),.;!?]+$/, '');
  const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new WebReadError('Only web links can be read', input);
  url.hash = '';
  return url.toString();
}

/** Web links in a message, normalised and without duplicates */
export function linksIn(message: string): string[] {
  const out = new Set<string>();
  for (const m of message.matchAll(/\b(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi)) {
    const f = m[0];
    // Skip email addresses (the part after @)
    if (/@/.test(f) || message[(m.index ?? 0) - 1] === '@') continue;
    try {
      out.add(normaliseUrl(f));
    } catch {
      // not a link after all
    }
  }
  return [...out].slice(0, 5);
}

/** True for addresses on private, local or reserved networks */
export function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v.startsWith('::ffff:')) return isPrivateAddress(v.slice(7));
    return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80') || v.startsWith('ff');
  }
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19))
  );
}

export type Resolver = (host: string) => Promise<{ address: string }[]>;
const dnsResolve: Resolver = (host) => lookup(host, { all: true });

async function assertPublic(url: URL, resolve: Resolver): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new WebReadError('That link isn’t a public website', url.toString());
  const addresses = isIP(host) ? [{ address: host }] : await resolve(host).catch(() => []);
  if (!addresses.length) throw new WebReadError(`I couldn’t find ${host}. Check the link?`, url.toString());
  if (addresses.some((a) => isPrivateAddress(a.address))) throw new WebReadError('That link isn’t a public website', url.toString());
}

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

/** Fetches a public URL (following up to 4 checked redirects); returns the final URL and the body */
export async function fetchPublic(
  input: string,
  fetcher: Fetcher = fetch,
  accept = 'text/html,*/*;q=0.5',
  resolve: Resolver = dnsResolve
): Promise<{ url: string; body: string; type: string }> {
  let url = new URL(normaliseUrl(input));
  for (let hop = 0; hop < 5; hop++) {
    await assertPublic(url, resolve);
    const res = await fetcher(url.toString(), {
      redirect: 'manual',
      headers: { 'User-Agent': UA, Accept: accept, 'Accept-Language': 'en' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }).catch((e: Error) => {
      throw new WebReadError(e.name === 'TimeoutError' ? `${url.hostname} took too long to answer` : `I couldn’t open ${url.hostname}`, url.toString());
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location')!, url);
      continue;
    }
    if (!res.ok) throw new WebReadError(`${url.hostname} answered with an error (${res.status})`, url.toString());
    const length = Number(res.headers.get('content-length') ?? 0);
    if (length > MAX_BYTES) throw new WebReadError('That page is too big to read', url.toString());
    const body = (await res.text()).slice(0, MAX_BYTES);
    return { url: url.toString(), body, type: res.headers.get('content-type') ?? '' };
  }
  throw new WebReadError('That link redirects too many times', input);
}

const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

/** Reads one page; `withStyles` also reads up to two of its stylesheets for colours and fonts */
export async function readPage(
  input: string,
  { fetcher = fetch, withStyles = true, resolve = dnsResolve }: { fetcher?: Fetcher; withStyles?: boolean; resolve?: Resolver } = {}
): Promise<PageRead> {
  const { url, body } = await fetchPublic(input, fetcher, undefined, resolve);
  const root = parse(body, { blockTextElements: { script: true, style: true, noscript: false } });
  const base = new URL(url);
  const abs = (href: string | undefined) => {
    if (!href) return '';
    try {
      return new URL(href, base).toString();
    } catch {
      return '';
    }
  };
  const meta = (key: string) => clean(root.querySelector(`meta[property="${key}"]`)?.getAttribute('content') ?? root.querySelector(`meta[name="${key}"]`)?.getAttribute('content'));

  // Styles: inline <style>, style="" attributes, and the first stylesheets
  let css = root.querySelectorAll('style').map((s) => s.text).join('\n');
  css += root.querySelectorAll('[style]').map((e) => e.getAttribute('style')).join(';');
  const sheets = root
    .querySelectorAll('link[rel~="stylesheet"]')
    .map((l) => abs(l.getAttribute('href')))
    .filter(Boolean);
  if (withStyles) {
    for (const sheet of sheets.filter((s) => !/fonts\.googleapis/.test(s)).slice(0, 2)) {
      css += await fetchPublic(sheet, fetcher, 'text/css,*/*;q=0.1', resolve).then((r) => r.body.slice(0, 400_000), () => '');
    }
  }

  // Links and logos first: removing the nav and footer for the text takes them out of the page
  const logos = logosOf(root, abs, meta('og:image'));
  const socials = socialsOf(root, abs);
  const morePages = morePagesOf(root, abs, base);

  const textRoot = root.querySelector('main') ?? root.querySelector('body') ?? root;
  for (const junk of textRoot.querySelectorAll('script, style, noscript, svg, nav, footer, form, iframe')) junk.remove();

  return {
    url,
    title: clean(meta('og:site_name') || root.querySelector('title')?.text),
    description: meta('og:description') || meta('description'),
    headings: textRoot
      .querySelectorAll('h1, h2, h3')
      .map((h) => clean(h.structuredText))
      .filter((h) => h && h.length < 140)
      .slice(0, 20),
    text: clean(textRoot.structuredText).slice(0, MAX_TEXT),
    logos,
    colors: colorsOf(css, meta('theme-color')),
    fonts: fontsOf(css, sheets),
    socials,
    morePages,
  };
}

function logosOf(root: HTMLElement, abs: (h?: string) => string, ogImage: string): string[] {
  const found: string[] = [];
  for (const img of root.querySelectorAll('img')) {
    const hint = `${img.getAttribute('alt') ?? ''} ${img.getAttribute('class') ?? ''} ${img.getAttribute('id') ?? ''} ${img.getAttribute('src') ?? ''}`;
    if (/logo/i.test(hint)) found.push(abs(img.getAttribute('src') ?? img.getAttribute('data-src')));
  }
  for (const rel of ['apple-touch-icon', 'icon', 'shortcut icon']) {
    for (const l of root.querySelectorAll(`link[rel="${rel}"]`)) found.push(abs(l.getAttribute('href')));
  }
  if (ogImage) found.push(abs(ogImage));
  return [...new Set(found.filter((u) => /^https?:/.test(u)))].slice(0, 6);
}

const NEUTRAL = /^#(f{3}|f{6}|0{3}|0{6}|fefefe|fafafa|f5f5f5|eeeeee|e5e5e5|dddddd|cccccc|333333|222222|111111)$/i;

/** Hex colours by how often they appear; near-white, near-black and greys last */
export function colorsOf(css: string, themeColor = ''): string[] {
  const counts = new Map<string, number>();
  const add = (hex: string, n = 1) => {
    let h = hex.toLowerCase();
    if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    if (h.length !== 7) return;
    counts.set(h, (counts.get(h) ?? 0) + n);
  };
  for (const m of css.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) add(m[0]);
  for (const m of css.matchAll(/rgba?\(\s*(\d{1,3})[ ,]+(\d{1,3})[ ,]+(\d{1,3})/gi)) {
    add(`#${[m[1], m[2], m[3]].map((v) => Math.min(255, Number(v)).toString(16).padStart(2, '0')).join('')}`);
  }
  if (/^#[0-9a-f]{3,6}$/i.test(themeColor)) add(themeColor, 50);
  const grey = (h: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    return Math.max(r, g, b) - Math.min(r, g, b) < 14;
  };
  return [...counts.entries()]
    .sort((a, b) => Number(NEUTRAL.test(a[0]) || grey(a[0])) - Number(NEUTRAL.test(b[0]) || grey(b[0])) || b[1] - a[1])
    .map(([h]) => h)
    .slice(0, 8);
}

const GENERIC_FONTS = /^(inherit|initial|serif|sans-serif|monospace|cursive|system-ui|-apple-system|blinkmacsystemfont|segoe ui|roboto|helvetica neue|helvetica|arial|ui-sans-serif|ui-serif|ui-monospace|emoji|apple color emoji|segoe ui emoji|var\(.*)$/i;

export function fontsOf(css: string, sheets: string[]): string[] {
  const found = new Map<string, number>();
  for (const s of sheets) {
    const fam = /fonts\.googleapis\.com\/css2?\?(.*)/.exec(s)?.[1];
    for (const m of fam?.matchAll(/family=([^:&]+)/g) ?? []) found.set(decodeURIComponent(m[1]).replace(/\+/g, ' '), 100);
  }
  for (const m of css.matchAll(/font-family\s*:\s*([^;}]+)/gi)) {
    const first = m[1].split(',')[0].replace(/["']/g, '').replace(/^.*\|/, '').trim();
    if (first && !GENERIC_FONTS.test(first) && !/fallback$/i.test(first)) found.set(first, (found.get(first) ?? 0) + 1);
  }
  return [...found.entries()].sort((a, b) => b[1] - a[1]).map(([f]) => f).slice(0, 4);
}

function socialsOf(root: HTMLElement, abs: (h?: string) => string): PageRead['socials'] {
  const out: PageRead['socials'] = {};
  for (const a of root.querySelectorAll('a[href]')) {
    const href = abs(a.getAttribute('href'));
    let host: string;
    try {
      host = new URL(href).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    for (const [platform, re] of Object.entries(SOCIAL_HOSTS) as [SocialPlatform, RegExp][]) {
      // Skip share buttons and the platforms' own pages
      if (re.test(host) && !out[platform] && !/sharer|share\?|intent\/|\/share|\/policies|\/legal/i.test(href) && new URL(href).pathname.length > 1) out[platform] = href;
    }
  }
  return out;
}

const WORTH_READING = /about|story|who-we-are|services|what-we-do|products|shop|menu|pricing|work|portfolio/i;

function morePagesOf(root: HTMLElement, abs: (h?: string) => string, base: URL): string[] {
  const pages = new Set<string>();
  for (const a of root.querySelectorAll('a[href]')) {
    const href = abs(a.getAttribute('href'));
    try {
      const u = new URL(href);
      if (u.hostname !== base.hostname || u.pathname === base.pathname) continue;
      if (WORTH_READING.test(u.pathname) || WORTH_READING.test(a.text)) {
        u.hash = '';
        u.search = '';
        pages.add(u.toString());
      }
    } catch {
      // ignore
    }
  }
  return [...pages].slice(0, 3);
}
