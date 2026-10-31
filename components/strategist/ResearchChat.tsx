'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { getResearch, startResearch, type PublicBrandResearch } from '@/lib/api/researchClient';
import { refreshCredits } from '@/lib/api/billingClient';
import type { BrandProfile, CompetitorFound, MediaImage, MediaVideo, ResearchStep, Socials } from '@/lib/models/brandResearch';
import { PENDING_PROMPT_KEY } from './TalkToZetca';
import { TalkBackground } from './TalkBackground';

const POLL_MS = 2500;
const GLASS = 'rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl';
const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50';

const SOCIAL_ICONS: Record<string, string> = {
  instagram: 'simple-icons:instagram',
  tiktok: 'simple-icons:tiktok',
  linkedin: 'simple-icons:linkedin',
  x: 'simple-icons:x',
  facebook: 'simple-icons:facebook',
  youtube: 'simple-icons:youtube',
};
const VIDEO_ICONS: Record<MediaVideo['platform'], string> = {
  youtube: 'simple-icons:youtube',
  vimeo: 'simple-icons:vimeo',
  tiktok: 'simple-icons:tiktok',
  instagram: 'simple-icons:instagram',
  file: 'lucide:film',
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** Black or white text, whichever reads better on a colour */
const inkOn = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#0b0b0f' : '#ffffff';
};

/** Script and handwriting fonts suit a name, not a whole sentence */
const SCRIPT_FONT = /script|hand|brush|signature|pinyon|vibes|cursive|calligraph|dancing|pacifico|satisfy/i;

const googleFontsHref = (fonts: string[]) =>
  `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&')}&display=swap`;

/**
 * Talk to Zetca's conversation, in the Strategist's dark style: starts the
 * research from the message sent on the Strategist page (or reopens one by
 * ?id=), then fills a visual board as findings arrive: photos, the brand kit,
 * brands like yours and what works for them.
 */
export function ResearchChat() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [research, setResearch] = useState<PublicBrandResearch | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const started = useRef(false);

  // A message waiting from the Strategist page: start the research
  useEffect(() => {
    if (id || started.current) return;
    started.current = true;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
    } catch {
      // private windows
    }
    if (!pending) {
      router.replace('/dashboard/strategist');
      return;
    }
    const sent = pending;
    queueMicrotask(() => setMessage(sent));
    startResearch(sent).then(
      (r) => {
        setResearch(r);
        router.replace(`/dashboard/strategist/chat?id=${r.researchId}`);
        void refreshCredits();
      },
      (e: Error) => setError(e.message)
    );
  }, [id, router]);

  // Check on it until it's finished
  useEffect(() => {
    if (!id) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await getResearch(id);
        if (stop) return;
        setResearch(r);
        if (r.status === 'working') timer = setTimeout(tick, POLL_MS);
        else void refreshCredits();
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : 'Couldn’t load this research');
      }
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  const profile = research?.profile;
  const working = !error && (!research || research.status === 'working');
  const sent = research?.message ?? message;

  return (
    <div className="talk-dark relative isolate overflow-hidden rounded-[28px] bg-black text-white font-sans min-h-[calc(100dvh-140px)]">
      <TalkBackground dim />
      <style>{`
        /* The app colours text with --on-surface (dark); on this page it follows the parent's colour */
        .talk-dark { --on-surface: currentColor; }
        .talk-dot { font-family: "BubbledotICG-FinePos", "Geist Pixel Circle", ui-monospace, monospace; letter-spacing: -0.04em; }
        .talk-in { animation: talkIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes talkIn { from { opacity: 0; transform: translateY(10px); filter: blur(4px); } }
        @media (prefers-reduced-motion: reduce) { .talk-in { animation: none; } }
      `}</style>

      <div className="px-4 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/strategist" aria-label="Back to Strategist" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <Icon icon="lucide:arrow-left" className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="talk-dot text-[clamp(22px,3vw,34px)] leading-none">Talk to Zetca</h1>
          {profile && <span className="talk-in rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">{profile.brandName}</span>}
        </div>

        {research && <Progress steps={research.steps} />}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
          <div className="order-2 space-y-5 lg:order-1" aria-busy={working}>
            <Board research={research} />
          </div>

          {/* The conversation */}
          <aside className={`${GLASS} order-1 flex flex-col gap-3 p-4 lg:order-2 lg:sticky lg:top-[96px]`} aria-label="Conversation">
            {sent && <Bubble from="user">{sent}</Bubble>}
            <Bubble from="zetca">On it. I’ll study your brand and a few like it. About two minutes.</Bubble>
            {error && <Bubble from="zetca" tone="error">{error}</Bubble>}
            {research?.status === 'failed' && research.error && <Bubble from="zetca" tone="error">{research.error}</Bubble>}
            {working && (
              <p role="status" className="flex items-center gap-2 px-1 text-sm text-white/60">
                <Icon icon="lucide:loader-circle" className="h-4 w-4 animate-spin" aria-hidden /> {research?.steps.find((s) => s.status === 'working')?.label ?? 'Starting'}…
              </p>
            )}
            {profile && research?.status === 'done' && (
              <>
                <Bubble from="zetca">
                  Here’s <strong>{profile.brandName}</strong> at a glance{research.competitors.length ? `, next to ${research.competitors.length} brands like you` : ''}.
                </Bubble>
                {research.comparison && (
                  <Bubble from="zetca">
                    <span className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Your edge</span>
                    {research.comparison.gap}
                  </Bubble>
                )}
                {profile.missing.length > 0 && (
                  <Bubble from="zetca">
                    <span className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Quick questions</span>
                    <ul className="mt-1 space-y-1">
                      {profile.missing.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </Bubble>
                )}
                <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-3 text-sm">
                  <p className="font-semibold">Next: your plan</p>
                  <p className="mt-0.5 text-white/60">Posts, visuals and a schedule from this. Coming next.</p>
                  <Link href="/dashboard/strategist/new" className="mt-2 inline-block font-semibold text-indigo-300 hover:text-indigo-200">
                    Build it step by step now →
                  </Link>
                </div>
              </>
            )}
            {research && research.status !== 'working' && (
              <Link href="/dashboard/strategist" className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
                <Icon icon="lucide:message-square-plus" className="h-4 w-4" aria-hidden /> New conversation
              </Link>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Bubble({ from, tone, children }: { from: 'user' | 'zetca'; tone?: 'error'; children: React.ReactNode }) {
  if (from === 'user') {
    return <div className="talk-in self-end max-w-[92%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-white px-4 py-3 text-[14px] leading-6 text-[#0b0b0f]">{children}</div>;
  }
  return (
    <div className="talk-in flex max-w-[96%] items-start gap-2">
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#0b0b0f]" aria-hidden>
        <Icon icon="lucide:box" className="h-4 w-4" />
      </span>
      <div className={`rounded-3xl rounded-tl-lg px-4 py-3 text-[14px] leading-6 ${tone === 'error' ? 'bg-red-500/20 text-red-100 border border-red-400/30' : 'bg-white/10 text-white'}`}>{children}</div>
    </div>
  );
}

const STEP_ICON: Record<ResearchStep['status'], string> = {
  waiting: 'lucide:circle-dashed',
  working: 'lucide:loader-circle',
  done: 'lucide:circle-check',
  skipped: 'lucide:circle-minus',
  failed: 'lucide:circle-alert',
};

function Progress({ steps }: { steps: ResearchStep[] }) {
  return (
    <ol className="mt-5 flex flex-wrap gap-2" aria-label="Progress">
      {steps.map((s) => (
        <li
          key={s.id}
          title={s.detail}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            s.status === 'done'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : s.status === 'working'
                ? 'border-white/30 bg-white/15 text-white'
                : s.status === 'failed'
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                  : 'border-white/10 bg-white/[0.04] text-white/40'
          }`}
        >
          <Icon icon={STEP_ICON[s.status]} className={`h-3.5 w-3.5 ${s.status === 'working' ? 'animate-spin' : ''}`} aria-hidden />
          {s.label}
        </li>
      ))}
    </ol>
  );
}

/** What Zetca found: visual first */
function Board({ research }: { research: PublicBrandResearch | null }) {
  if (!research) return <Shimmer />;
  const { profile, media, chips, socials, competitors, comparison } = research;
  const kit = profile?.brandKit;
  const fonts = [kit?.headingFont, kit?.bodyFont].filter(Boolean) as string[];
  return (
    <>
      {fonts.length > 0 && <link rel="stylesheet" href={googleFontsHref(fonts)} precedence="default" />}

      {/* The brand, like a profile card */}
      {profile ? (
        <section className={`${GLASS} talk-in p-5`} aria-label="Your brand">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
              {kit?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kit.logoUrl} alt={`${profile.brandName} logo`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl font-bold text-[#0b0b0f]">{profile.brandName.slice(0, 1)}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[clamp(22px,2.6vw,30px)] font-bold leading-tight" style={kit?.headingFont ? { fontFamily: `"${kit.headingFont}", serif` } : undefined}>
                {profile.brandName}
              </h2>
              <p className="text-[15px] text-white/70">{profile.tagline}</p>
            </div>
            <Platforms socials={socials} />
          </div>
          {chips.length > 0 && <Chips items={chips} className="mt-4" />}
        </section>
      ) : (
        chips.length > 0 && <Chips items={chips} className="talk-in" />
      )}

      {/* Photos and videos */}
      {media.images.length + media.videos.length > 0 ? <Mosaic images={media.images} videos={media.videos} /> : research.status === 'working' && <Shimmer />}

      {/* The brand kit and who it's for */}
      {profile && kit && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={`${GLASS} talk-in p-5 md:col-span-2`} aria-label="Colours">
            <p className={LABEL}>Colours</p>
            {kit.colors.length ? (
              <div className="mt-3 flex h-28 overflow-hidden rounded-2xl">
                {kit.colors.map((c) => (
                  <div key={c.hex} className="flex flex-1 flex-col justify-end p-3" style={{ background: c.hex, color: inkOn(c.hex) }}>
                    <span className="text-sm font-semibold">{c.name}</span>
                    <span className="text-[11px] uppercase opacity-70">{c.hex}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/50">No colours found on the site</p>
            )}
          </section>
          {fonts.length > 0 && (
            <section className={`${GLASS} talk-in p-5`} aria-label="Fonts">
              <p className={LABEL}>Fonts</p>
              <div className="mt-3 flex items-end gap-6">
                {kit.headingFont && (
                  <div>
                    <span className="block text-5xl leading-none" style={{ fontFamily: `"${kit.headingFont}", serif` }}>
                      Aa
                    </span>
                    <span className="mt-2 block text-xs text-white/60">{kit.headingFont}</span>
                  </div>
                )}
                {kit.bodyFont && (
                  <div>
                    <span className="block text-2xl leading-none" style={{ fontFamily: `"${kit.bodyFont}", sans-serif` }}>
                      Aa
                    </span>
                    <span className="mt-2 block text-xs text-white/60">{kit.bodyFont}</span>
                  </div>
                )}
              </div>
            </section>
          )}
          <section className={`${GLASS} talk-in p-5 space-y-4 ${fonts.length ? '' : 'md:col-span-2'}`} aria-label="Who it's for">
            <TagRow label="Customers" icon="lucide:users" items={profile.audience} />
            <TagRow label="How you sound" icon="lucide:message-circle" items={profile.voice} />
            <TagRow label="Your look" icon="lucide:camera" items={kit.look} />
          </section>
        </div>
      )}

      {/* Brands like yours */}
      {competitors.length > 0 && profile && (
        <section className="talk-in space-y-3" aria-label="Brands like yours">
          <h2 className="talk-dot text-[clamp(18px,2.2vw,26px)] leading-none">Brands like yours</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BrandCard
              you
              name={profile.brandName}
              logo={kit?.logoUrl}
              cover={media.images[0]?.url}
              colors={kit?.colors.map((c) => c.hex) ?? []}
              line={comparison?.positioning ?? profile.tagline}
              tags={profile.strengths}
              socials={socials}
              thumbs={media.images.slice(1, 4)}
            />
            {competitors.map((c) => (
              <CompetitorCard key={c.name} c={c} />
            ))}
          </div>
        </section>
      )}
      {research.steps.find((s) => s.id === 'competitors')?.status === 'working' && <Shimmer tall />}

      {/* What works for them */}
      {comparison && comparison.whatWorks.length > 0 && (
        <section className="talk-in space-y-3" aria-label="What works for them">
          <h2 className="talk-dot text-[clamp(18px,2.2vw,26px)] leading-none">What works for them</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comparison.whatWorks.map((w) => {
              const by = competitors.find((c) => c.name.toLowerCase() === w.competitor.toLowerCase());
              const photo = by?.media.images[0]?.url;
              return (
                <a key={w.title} href={w.source} target="_blank" rel="noopener noreferrer" className={`${GLASS} group overflow-hidden`}>
                  <div className="relative h-32 bg-white/5">
                    {photo && <Photo src={photo} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />}
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold">{w.competitor}</span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{w.title}</p>
                    <p className="mt-1 text-sm text-white/60">{w.detail}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Your positioning, in the brand's own colours */}
      {comparison && kit && (
        <section
          className="talk-in rounded-3xl p-6 sm:p-8"
          style={{ background: kit.colors[0]?.hex ?? '#ffffff', color: inkOn(kit.colors[0]?.hex ?? '#ffffff') }}
          aria-label="Your positioning"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">Your positioning</p>
          <p
            className="mt-2 text-[clamp(22px,3vw,36px)] font-bold leading-tight"
            style={kit.headingFont && !SCRIPT_FONT.test(kit.headingFont) ? { fontFamily: `"${kit.headingFont}", serif` } : undefined}
          >
            {comparison.positioning}
          </p>
        </section>
      )}

      {/* Sources, folded away */}
      {profile && profile.facts.length > 0 && (
        <details className={`${GLASS} p-4 text-sm`}>
          <summary className="cursor-pointer font-semibold text-white/80">Where this came from</summary>
          <ul className="mt-3 space-y-2">
            {profile.facts.map((f, i) => (
              <li key={i} className="text-white/80">
                {f.text} <SourceChip url={f.source} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Shimmer({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${tall ? '' : ''}`} aria-hidden>
      {Array.from({ length: tall ? 4 : 6 }).map((_, i) => (
        <div key={i} className={`${tall ? 'h-56' : 'h-32'} animate-pulse rounded-2xl bg-white/[0.07]`} style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

function Chips({ items, className = '' }: { items: string[]; className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((c) => (
        <span key={c} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[13px] font-medium">
          {c}
        </span>
      ))}
    </div>
  );
}

function TagRow({ label, icon, items }: { label: string; icon: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`${LABEL} flex items-center gap-1.5`}>
        <Icon icon={icon} className="h-3.5 w-3.5" aria-hidden /> {label}
      </p>
      <Chips items={items} className="mt-2" />
    </div>
  );
}

function Platforms({ socials, small = false }: { socials: Socials; small?: boolean }) {
  const list = Object.entries(socials) as [string, string][];
  if (!list.length) return null;
  return (
    <div className="flex gap-1.5">
      {list.map(([p, url]) => (
        <a
          key={p}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={p}
          className={`grid place-items-center rounded-full bg-white text-[#0b0b0f] hover:scale-105 transition ${small ? 'h-7 w-7' : 'h-9 w-9'}`}
        >
          <Icon icon={SOCIAL_ICONS[p] ?? 'lucide:link'} className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
        </a>
      ))}
    </div>
  );
}

function SourceChip({ url }: { url: string }) {
  if (!/^https?:/.test(url)) return <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">{url}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60 hover:text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://www.google.com/s2/favicons?domain=${hostOf(url)}&sz=32`} alt="" className="h-3 w-3 rounded-sm" referrerPolicy="no-referrer" />
      {hostOf(url)}
    </a>
  );
}

/** An image from another site; hides itself if that site won't serve it */
function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={className} />;
}

function Mosaic({ images, videos }: { images: MediaImage[]; videos: MediaVideo[] }) {
  const tiles = [...images.slice(0, 8).map((i) => ({ kind: 'image' as const, i })), ...videos.slice(0, 3).map((v) => ({ kind: 'video' as const, v }))];
  return (
    <section className="talk-in" aria-label="Photos and videos">
      <div className="grid auto-rows-[120px] grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t, n) =>
          t.kind === 'image' ? (
            <a
              key={t.i.url}
              href={t.i.source}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl bg-white/5 ${n === 0 ? 'col-span-2 row-span-2' : ''}`}
              title={t.i.caption}
            >
              <Photo src={t.i.url} alt={t.i.caption ?? ''} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80">{hostOf(t.i.source)}</span>
            </a>
          ) : (
            <a key={t.v.url} href={t.v.url} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl bg-white/10">
              {t.v.thumbnail ? <Photo src={t.v.thumbnail} alt="" className="h-full w-full object-cover opacity-80" /> : null}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#0b0b0f] transition group-hover:scale-110">
                  <Icon icon="lucide:play" className="h-5 w-5 translate-x-[1px]" aria-hidden />
                </span>
              </span>
              <Icon icon={VIDEO_ICONS[t.v.platform]} className="absolute bottom-2 left-2 h-4 w-4 text-white" aria-hidden />
            </a>
          )
        )}
      </div>
    </section>
  );
}

function BrandCard({
  you = false,
  name,
  logo,
  cover,
  colors,
  line,
  tags,
  socials,
  thumbs,
  site,
}: {
  you?: boolean;
  name: string;
  logo?: string;
  cover?: string;
  colors: string[];
  line?: string;
  tags: string[];
  socials: Socials;
  thumbs: MediaImage[];
  site?: string;
}) {
  return (
    <article className={`${GLASS} talk-in flex flex-col overflow-hidden ${you ? 'ring-2 ring-white/70' : ''}`}>
      <div className="relative h-28 bg-gradient-to-br from-white/10 to-white/[0.02]">
        {cover && <Photo src={cover} alt="" className="h-full w-full object-cover" />}
        {you && <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#0b0b0f]">You</span>}
        <span className="absolute -bottom-6 left-4 grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-black bg-white">
          {logo ? <Photo src={logo} alt="" className="h-full w-full object-cover" /> : <span className="font-bold text-[#0b0b0f]">{name.slice(0, 1)}</span>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 pt-8">
        <div>
          <p className="font-semibold leading-tight">{name}</p>
          {site && <SourceChip url={site} />}
        </div>
        {colors.length > 0 && (
          <div className="flex gap-1" aria-label="Colours">
            {colors.slice(0, 5).map((c) => (
              <span key={c} className="h-4 w-4 rounded-full border border-white/20" style={{ background: c }} />
            ))}
          </div>
        )}
        {line && <p className="text-sm text-white/70">{line}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-white/10 px-2 py-0.5 text-[11px]">
                {t}
              </span>
            ))}
          </div>
        )}
        {thumbs.length > 0 && (
          <div className="mt-auto grid grid-cols-3 gap-1.5">
            {thumbs.slice(0, 3).map((t) => (
              <div key={t.url} className="aspect-square overflow-hidden rounded-lg bg-white/5">
                <Photo src={t.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <Platforms socials={socials} small />
      </div>
    </article>
  );
}

function CompetitorCard({ c }: { c: CompetitorFound }) {
  return (
    <BrandCard
      name={c.name}
      logo={c.logoUrl}
      cover={c.media.images[0]?.url}
      colors={c.colors}
      line={c.positioning ?? c.why}
      tags={[...(c.contentStyle ?? []), ...(c.offers ?? [])]}
      socials={c.socials}
      thumbs={c.media.images.slice(1, 4)}
      site={c.website}
    />
  );
}

export type { BrandProfile };
