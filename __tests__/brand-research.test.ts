/**
 * @jest-environment node
 */
import { colorsOf, fontsOf, isPrivateAddress, linksIn, readPage, videoFrom, WebReadError } from '@/lib/research/webReader';
import { keepCandidates } from '@/lib/research/brandProfile';
import { BrandResearchService, imagesOfBrand, platformOf, STEPS } from '@/lib/services/brandResearchService';
import type { BrandProfile, BrandResearch } from '@/lib/models/brandResearch';
import type { PageRead } from '@/lib/research/webReader';

/** A stand-in for DNS: inside.example points into a private network */
const resolve = async (host: string) => [{ address: host === 'inside.example' ? '10.0.0.5' : '93.184.216.34' }];

const html = (body: string) => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });

const SITE = `<!doctype html><html><head><title>Crumb &amp; Co. - Lagos bakery</title>
<meta name="description" content="Custom cakes in Lekki"><meta name="theme-color" content="#4A2C1D">
<link rel="icon" href="/favicon.png"><style>h1{font-family:"Fraunces",serif;color:#E0A526} body{font-family:Inter,sans-serif;background:#FFF4E0}</style></head>
<body><nav><a href="/about">About us</a></nav><main><img src="/img/logo.png" alt="Crumb logo"><h1>Cakes for<br>every celebration</h1><p>Order on WhatsApp.</p>
<img src="/img/cake-150x150.jpg"><img srcset="/img/cake-400.jpg 400w, /img/cake-1200.jpg 1200w" alt="Wedding cake"><div style="background-image:url('/img/shop.jpg')"></div>
<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></main>
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
    // Photos: the largest from a srcset and a background photo; small thumbnails and logos skipped
    expect(p.images.map((i) => i.url)).toEqual(['https://crumbandco.ng/img/cake-1200.jpg', 'https://crumbandco.ng/img/shop.jpg']);
    expect(p.videos).toEqual([{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', platform: 'youtube', thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }]);
  });

  it('knows videos by their address', () => {
    expect(videoFrom('https://youtu.be/dQw4w9WgXcQ')?.platform).toBe('youtube');
    expect(videoFrom('https://www.tiktok.com/@crumb/video/123456')?.platform).toBe('tiktok');
    expect(videoFrom('https://www.instagram.com/reel/AbC123/')?.platform).toBe('instagram');
    expect(videoFrom('https://crumbandco.ng/about')).toBeNull();
  });

  it('keeps only search images that are clearly the brand’s', () => {
    const kept = imagesOfBrand(
      [
        { url: 'https://crumbandco.ng/uploads/cake.jpg' },
        { url: 'https://lookaside.instagram.com/seo/x?media_id=1', title: 'Wedding cake by Crumb & Co. Lagos' },
        { url: 'https://lookaside.instagram.com/seo/x?media_id=2', title: 'Another bakery’s cake' },
        { url: 'https://static.othersite.com/crumb-cake.jpg', title: 'Crumb & Co. cake' },
      ],
      'Crumb & Co.',
      'https://crumbandco.ng/'
    );
    expect(kept.map((k) => k.url)).toEqual(['https://crumbandco.ng/uploads/cake.jpg', 'https://lookaside.instagram.com/seo/x?media_id=1']);
    expect(kept[1].source).toBe('https://www.instagram.com');
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
  images: [{ url: 'https://crumbandco.ng/cake.jpg' }],
  videos: [],
  colors: ['#4a2c1d', '#e0a526'],
  fonts: ['Fraunces'],
  socials: { tiktok: 'https://tiktok.com/@crumb' },
  morePages: ['https://crumbandco.ng/about'],
  ...over,
});

const profile: BrandProfile = {
  brandName: 'Crumb & Co.',
  tagline: 'Celebration cakes in Lekki',
  category: 'custom cake bakery',
  location: 'Lagos, Nigeria',
  offerings: ['Custom cakes'],
  audience: ['Families'],
  voice: ['Warm'],
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
    look: ['Warm light'],
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
    const read = jest.fn(async (url: string) =>
      url.includes('butterlane')
        ? page({ url, title: 'Butter Lane Bakery', logos: [], images: [], colors: ['#111111'], socials: {}, morePages: [] })
        : url.includes('about')
          ? page({ url, logos: [], images: [], socials: {} })
          : page()
    );
    const search = {
      available: true,
      find: jest.fn(async (q: string) =>
        /bakery/.test(q)
          ? { results: [{ title: 'Butter Lane Bakery', url: 'https://butterlane.ng', content: 'Cakes in Lagos' }], images: [] }
          : /Butter Lane/.test(q)
            ? { results: [{ title: 'Butter Lane on Instagram', url: 'https://www.instagram.com/butterlane', content: 'Cakes' }], images: [{ url: 'https://butterlane.ng/cake.jpg' }] }
            : {
                results: [
                  { title: 'Crumb & Co. on Instagram', url: 'https://www.instagram.com/crumbandco', content: 'Cakes' },
                  { title: 'Crumb & Co. cake video', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', content: 'Making a cake' },
                ],
                images: [{ url: 'https://lookaside.instagram.com/seo/x?media_id=1', title: 'Wedding cake by Crumb & Co.' }],
              }
      ),
    };
    const writer = {
      profile: jest.fn(async (input: { pages: PageRead[] }) => (void input, profile)),
      pickCompetitors: jest.fn(async () => ({ competitors: [{ name: 'Butter Lane Bakery', website: 'https://butterlane.ng', why: 'Cakes in Lagos' }] })),
      compare: jest.fn(async () => ({
        competitors: [{ name: 'Butter Lane Bakery', positioning: 'Luxury cakes', contentStyle: ['Reels'], offers: ['Same-day'] }],
        whatWorks: [{ title: 'Behind the scenes', detail: 'People love the process', competitor: 'Butter Lane Bakery', source: 'https://butterlane.ng' }],
        gap: 'Nobody posts prices',
        positioning: 'Lekki’s celebration cake bakery',
      })),
    };
    const service = new BrandResearchService(writer, search as never, s3 as never, read as never);
    return { service, read, search, writer, files };
  }

  const start = (message: string): BrandResearch => ({
    researchId: '00000000-0000-4000-8000-000000000000',
    userId: 'u1',
    message,
    status: 'working',
    steps: STEPS.map((s) => ({ ...s, status: 'waiting' as const })),
    socials: {},
    media: { images: [], videos: [] },
    chips: [],
    competitors: [],
    cost: 10,
    createdAt: '',
    updatedAt: '',
  });

  it('reads the site, searches with photos, builds the brand, then finds and compares similar brands', async () => {
    const t = setup();
    const done = await t.service.run(start('I run a bakery. crumbandco.ng'));
    expect(t.read).toHaveBeenCalledWith('https://crumbandco.ng/');
    expect(t.read).toHaveBeenCalledWith('https://crumbandco.ng/about', { withStyles: false });
    expect(t.search.find).toHaveBeenCalledWith('"Crumb & Co."', expect.objectContaining({ excludeDomains: ['crumbandco.ng'], images: true }));
    expect(t.search.find).toHaveBeenCalledWith('custom cake bakery in Lagos, Nigeria', expect.anything());
    expect(done.status).toBe('done');
    expect(done.steps.map((s) => s.status)).toEqual(['done', 'done', 'done', 'done', 'done']);
    // Photos from the site and the brand's Instagram images; a video from search
    expect(done.media.images.map((i) => i.url)).toEqual(['https://crumbandco.ng/cake.jpg', 'https://lookaside.instagram.com/seo/x?media_id=1']);
    expect(done.media.videos[0]).toMatchObject({ platform: 'youtube' });
    // The competitor, with what the comparison says about them
    expect(done.competitors).toEqual([
      expect.objectContaining({ name: 'Butter Lane Bakery', positioning: 'Luxury cakes', socials: { instagram: 'https://www.instagram.com/butterlane' } }),
    ]);
    expect(done.comparison).toMatchObject({ gap: 'Nobody posts prices', positioning: 'Lekki’s celebration cake bakery' });
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
    expect(t.read).not.toHaveBeenCalledWith('https://crumbandco.ng/');
    expect(done.steps.find((s) => s.id === 'website')?.status).toBe('skipped');
    expect(t.search.find).toHaveBeenCalledWith('I run a small bakery in Lagos and want more orders', expect.anything());
    expect(done.status).toBe('done');
  });
});
