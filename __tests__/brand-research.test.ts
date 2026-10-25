/**
 * @jest-environment node
 */
import { colorsOf, fontsOf, isPrivateAddress, linksIn, readPage, WebReadError } from '@/lib/research/webReader';
import { keepCandidates } from '@/lib/research/brandProfile';
import { BrandResearchService, platformOf } from '@/lib/services/brandResearchService';
import type { BrandProfile, BrandResearch } from '@/lib/models/brandResearch';
import type { PageRead } from '@/lib/research/webReader';

/** A stand-in for DNS: inside.example points into a private network */
const resolve = async (host: string) => [{ address: host === 'inside.example' ? '10.0.0.5' : '93.184.216.34' }];

const html = (body: string) => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });

const SITE = `<!doctype html><html><head><title>Crumb &amp; Co. - Lagos bakery</title>
<meta name="description" content="Custom cakes in Lekki"><meta name="theme-color" content="#4A2C1D">
<link rel="icon" href="/favicon.png"><style>h1{font-family:"Fraunces",serif;color:#E0A526} body{font-family:Inter,sans-serif;background:#FFF4E0}</style></head>
<body><nav><a href="/about">About us</a></nav><main><img src="/img/logo.png" alt="Crumb logo"><h1>Cakes for<br>every celebration</h1><p>Order on WhatsApp.</p></main>
<footer><a href="https://instagram.com/crumbandco.lagos">IG</a><a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a></footer></body></html>`;

describe('reading a website', () => {
  it('finds the words, logo, colours, fonts, socials and pages worth reading', async () => {
    const fetcher = jest.fn(async () => html(SITE));
    const p = await readPage('crumbandco.ng', { fetcher, withStyles: false, resolve });
    expect(p).toMatchObject({ url: 'https://crumbandco.ng/', title: 'Crumb & Co. - Lagos bakery', description: 'Custom cakes in Lekki' });
    expect(p.headings[0]).toBe('Cakes for every celebration');
    expect(p.logos[0]).toBe('https://crumbandco.ng/img/logo.png');
    expect(p.colors.slice(0, 3)).toEqual(['#4a2c1d', '#e0a526', '#fff4e0']);
    expect(p.fonts).toEqual(['Fraunces', 'Inter']);
    // The footer link is found; share buttons aren't
    expect(p.socials).toEqual({ instagram: 'https://instagram.com/crumbandco.lagos' });
    expect(p.morePages).toEqual(['https://crumbandco.ng/about']);
  });

  it('never fetches private or local addresses, even through a redirect', async () => {
    expect(isPrivateAddress('127.0.0.1')).toBe(true);
    expect(isPrivateAddress('169.254.169.254')).toBe(true);
    expect(isPrivateAddress('::ffff:10.1.2.3')).toBe(true);
    expect(isPrivateAddress('93.184.216.34')).toBe(false);
    await expect(readPage('http://localhost:3000', { fetcher: jest.fn(), resolve })).rejects.toBeInstanceOf(WebReadError);
    await expect(readPage('inside.example', { fetcher: jest.fn(), resolve })).rejects.toThrow('isn’t a public website');
    const fetcher = jest.fn(async () => new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }));
    await expect(readPage('crumbandco.ng', { fetcher, resolve })).rejects.toThrow('isn’t a public website');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('pulls links out of a message', () => {
    expect(linksIn('We are at crumbandco.ng and https://instagram.com/crumb. Email hi@crumb.ng')).toEqual(['https://crumbandco.ng/', 'https://instagram.com/crumb']);
  });

  it('ranks brand colours above greys and lists real fonts', () => {
    expect(colorsOf('a{color:#fff} b{color:#333} c{color:#c8973a} d{color:#c8973a} e{color:rgb(61,10,32)}')).toEqual(['#c8973a', '#3d0a20', '#ffffff', '#333333']);
    expect(fontsOf('h1{font-family:"google_fonts|Playfair Display"} p{font-family:"Inter Fallback"} q{font-family:Arial}', ['https://fonts.googleapis.com/css2?family=Open+Sans:wght@400'])).toEqual(['Open Sans', 'Playfair Display']);
  });

  it('knows social sites by their address', () => {
    expect(platformOf('https://www.tiktok.com/@crumb')).toBe('tiktok');
    expect(platformOf('https://crumbandco.ng')).toBeNull();
  });
});

const page = (over: Partial<PageRead> = {}): PageRead => ({
  url: 'https://crumbandco.ng/',
  title: 'Crumb & Co. - Lagos bakery',
  description: 'Custom cakes',
  headings: [],
  text: '',
  logos: ['https://crumbandco.ng/logo.png'],
  colors: ['#4a2c1d', '#e0a526'],
  fonts: ['Fraunces'],
  socials: { tiktok: 'https://tiktok.com/@crumb' },
  morePages: ['https://crumbandco.ng/about'],
  ...over,
});

const profile: BrandProfile = {
  brandName: 'Crumb & Co.',
  summary: 'A bakery',
  offerings: [],
  audience: 'Families',
  voice: 'Warm',
  goals: [],
  strengths: [],
  facts: [],
  brandKit: {
    logoUrl: 'https://made-up.example/logo.png',
    colors: [
      { hex: '#4A2C1D', role: 'primary', name: 'Cocoa' },
      { hex: '#123456', role: 'accent', name: 'Invented' },
    ],
    headingFont: 'Fraunces',
    bodyFont: 'Comic Sans',
    look: 'Warm',
  },
  missing: [],
};

describe('the brand kit', () => {
  it('keeps only the logo, colours and fonts found on the site', () => {
    const kit = keepCandidates(profile, { message: '', pages: [page()], socialPages: [], search: [] }).brandKit;
    expect(kit.logoUrl).toBeUndefined();
    expect(kit.colors).toEqual([{ hex: '#4a2c1d', role: 'primary', name: 'Cocoa' }]);
    expect(kit).toMatchObject({ headingFont: 'Fraunces', bodyFont: undefined });
  });
});

describe('the research', () => {
  function setup() {
    const files = new Map<string, string>();
    const s3 = {
      send: jest.fn(async (cmd: { constructor: { name: string }; input: { Key: string; Body?: string } }) => {
        if (cmd.constructor.name === 'PutObjectCommand') return files.set(cmd.input.Key, cmd.input.Body!), {};
        return { Body: { transformToString: async () => files.get(cmd.input.Key)! } };
      }),
    };
    const read = jest.fn(async (url: string) => (url.includes('about') ? page({ url, logos: [], socials: {} }) : page()));
    const search = { available: true, search: jest.fn(async () => [{ title: 'Crumb & Co. on Instagram', url: 'https://www.instagram.com/crumbandco', content: 'Cakes' }]) };
    const writer = { profile: jest.fn(async (input: { pages: PageRead[] }) => (void input, profile)) };
    const service = new BrandResearchService(writer, search as never, s3 as never, read as never);
    return { service, read, search, writer, files };
  }

  const start = (message: string): BrandResearch => ({
    researchId: '00000000-0000-4000-8000-000000000000',
    userId: 'u1',
    message,
    status: 'working',
    steps: (['links', 'website', 'web', 'profile'] as const).map((id) => ({ id, label: id, status: 'waiting' })),
    findings: [],
    socials: {},
    cost: 10,
    createdAt: '',
    updatedAt: '',
  });

  it('reads the site and its about page, searches by brand name, and saves the profile', async () => {
    const t = setup();
    const done = await t.service.run(start('I run a bakery. crumbandco.ng'));
    expect(t.read).toHaveBeenCalledWith('https://crumbandco.ng/');
    expect(t.read).toHaveBeenCalledWith('https://crumbandco.ng/about', { withStyles: false });
    expect(t.search.search).toHaveBeenCalledWith('"Crumb & Co."', expect.objectContaining({ excludeDomains: ['crumbandco.ng'] }));
    expect(done.status).toBe('done');
    expect(done.steps.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done']);
    expect(done.socials).toMatchObject({ tiktok: 'https://tiktok.com/@crumb', instagram: 'https://www.instagram.com/crumbandco' });
    // The writer got the site pages and search results; Instagram's login page wasn't read
    const input = t.writer.profile.mock.calls[0][0];
    expect(input.pages).toHaveLength(2);
    expect(t.read).not.toHaveBeenCalledWith(expect.stringContaining('instagram'), expect.anything());
    expect(JSON.parse([...t.files.values()].at(-1)!).profile.brandName).toBe('Crumb & Co.');
  });

  it('carries on without a website', async () => {
    const t = setup();
    const done = await t.service.run(start('I run a small bakery in Lagos and want more orders'));
    expect(t.read).not.toHaveBeenCalled();
    expect(done.steps.find((s) => s.id === 'website')?.status).toBe('skipped');
    expect(t.search.search).toHaveBeenCalledWith('I run a small bakery in Lagos and want more orders', expect.anything());
    expect(done.status).toBe('done');
  });
});
