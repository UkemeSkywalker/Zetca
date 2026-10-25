'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { getResearch, startResearch, type PublicBrandResearch } from '@/lib/api/researchClient';
import { refreshCredits } from '@/lib/api/billingClient';
import type { BrandProfile, ResearchStep } from '@/lib/models/brandResearch';
import { PENDING_PROMPT_KEY } from './TalkToZetca';

const POLL_MS = 2000;
const CARD = 'bg-white rounded-2xl border border-[#E2E8F0]';

const SOCIAL_ICONS: Record<string, string> = {
  instagram: 'simple-icons:instagram',
  tiktok: 'simple-icons:tiktok',
  linkedin: 'simple-icons:linkedin',
  x: 'simple-icons:x',
  facebook: 'simple-icons:facebook',
  youtube: 'simple-icons:youtube',
};

const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').slice(0, 48);
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/**
 * Talk to Zetca's conversation: starts the research from the message the
 * user sent on the Strategist page (or reopens one by ?id=), then shows
 * findings as they arrive and the brand profile and kit at the end.
 */
export function ResearchChat() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [research, setResearch] = useState<PublicBrandResearch | null>(null);
  const [error, setError] = useState('');
  const started = useRef(false);

  // A message waiting from the Strategist page: start the research
  useEffect(() => {
    if (id || started.current) return;
    started.current = true;
    let message: string | null = null;
    try {
      message = sessionStorage.getItem(PENDING_PROMPT_KEY);
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
    } catch {
      // private windows
    }
    if (!message) {
      router.replace('/dashboard/strategist');
      return;
    }
    startResearch(message).then(
      (r) => {
        setResearch(r);
        router.replace(`/dashboard/strategist/chat?id=${r.researchId}`);
        void refreshCredits();
      },
      (e: Error) => {
        setError(e.message);
        setResearch({ researchId: '', message, status: 'failed', steps: [], findings: [], socials: {}, cost: 0, createdAt: '', updatedAt: '' });
      }
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
  const working = research?.status === 'working' || (!research && !error);

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1280px] mx-auto font-heading">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/strategist" aria-label="Back to Strategist" className="p-2 rounded-lg hover:bg-white text-[#0B1C30]">
          <Icon icon="lucide:arrow-left" className="w-5 h-5" aria-hidden />
        </Link>
        <h1 className="text-[22px] font-bold text-[#0B1C30]">Talk to Zetca</h1>
        {profile && <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">{profile.brandName}</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_400px] items-start">
        {/* What Zetca found */}
        <section className={`${CARD} p-6 space-y-6 order-2 lg:order-1`} aria-labelledby="found-title" aria-busy={working}>
          <div>
            <h2 id="found-title" className="text-lg font-bold text-[#0B1C30]">
              {profile ? 'What Zetca found' : 'What Zetca found so far'}
            </h2>
            {research && research.steps.length > 0 && <Steps steps={research.steps} />}
          </div>
          {profile ? <Profile profile={profile} socials={research!.socials} /> : <Findings research={research} />}
        </section>

        {/* The conversation */}
        <section className={`${CARD} p-4 flex flex-col gap-3 order-1 lg:order-2 lg:sticky lg:top-[96px]`} aria-label="Conversation">
          {research?.message && <Bubble from="user">{research.message}</Bubble>}
          <Bubble from="zetca">
            I’ll look at your website and what’s public about you online, then put your brand together. This takes about a minute.
          </Bubble>
          {error && <Bubble from="zetca" tone="error">{error}</Bubble>}
          {research?.status === 'failed' && research.error && <Bubble from="zetca" tone="error">{research.error}</Bubble>}
          {working && (
            <p role="status" className="flex items-center gap-2 px-2 text-sm text-[#777587]">
              <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin text-primary" aria-hidden /> Researching…
            </p>
          )}
          {profile && (
            <>
              <Bubble from="zetca">
                Here’s what I found about <strong>{profile.brandName}</strong>: {profile.summary}
                {profile.missing.length > 0 && (
                  <>
                    <br />
                    <br />A few things I couldn’t find:
                    <ul className="mt-1 list-disc pl-5">
                      {profile.missing.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </>
                )}
              </Bubble>
              <div className="rounded-xl border border-primary/20 bg-primary-50/60 p-3 text-sm text-[#0B1C30]">
                <p className="font-semibold">Next: brands like yours</p>
                <p className="mt-0.5 text-[#464555]">I’ll compare you with 2–3 similar brands and recommend a plan. That part is coming next.</p>
                <Link href="/dashboard/strategist/new" className="mt-2 inline-block font-semibold text-primary hover:underline">
                  Or build your plan step by step now
                </Link>
              </div>
            </>
          )}
          {research && research.status !== 'working' && (
            <Link
              href="/dashboard/strategist"
              className="self-start inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm font-semibold text-[#0B1C30] hover:bg-[#F8F9FF]"
            >
              <Icon icon="lucide:message-square-plus" className="w-4 h-4" aria-hidden /> Start a new conversation
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}

function Bubble({ from, tone, children }: { from: 'user' | 'zetca'; tone?: 'error'; children: React.ReactNode }) {
  if (from === 'user') {
    return <div className="self-end max-w-[90%] rounded-2xl rounded-br-md bg-primary px-4 py-3 text-[14px] leading-6 text-white whitespace-pre-wrap break-words">{children}</div>;
  }
  return (
    <div className="flex items-start gap-2 max-w-[95%]">
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-blue-500 text-white" aria-hidden>
        <Icon icon="lucide:box" className="w-4 h-4" />
      </span>
      <div className={`rounded-2xl rounded-tl-md border px-4 py-3 text-[14px] leading-6 ${tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-[#E2E8F0] bg-white text-[#0B1C30]'}`}>{children}</div>
    </div>
  );
}

const STEP_ICON: Record<ResearchStep['status'], string> = {
  waiting: 'lucide:circle',
  working: 'lucide:loader-circle',
  done: 'lucide:circle-check',
  skipped: 'lucide:circle-minus',
  failed: 'lucide:circle-alert',
};

function Steps({ steps }: { steps: ResearchStep[] }) {
  return (
    <ol className="mt-3 grid gap-2 sm:grid-cols-2">
      {steps.map((s) => (
        <li key={s.id} className={`flex items-start gap-2 text-sm ${s.status === 'waiting' ? 'text-[#94A3B8]' : 'text-[#0B1C30]'}`}>
          <Icon
            icon={STEP_ICON[s.status]}
            className={`mt-0.5 w-4 h-4 shrink-0 ${s.status === 'working' ? 'animate-spin text-primary' : s.status === 'done' ? 'text-emerald-600' : s.status === 'failed' ? 'text-amber-600' : ''}`}
            aria-hidden
          />
          <span>
            <span className="font-semibold">{s.label}</span>
            {s.detail && <span className="block text-xs text-[#777587]">{s.detail}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Findings({ research }: { research: PublicBrandResearch | null }) {
  if (!research?.findings.length) return <div className="h-40 rounded-xl bg-[#F8F9FF] animate-pulse" aria-hidden />;
  return (
    <ul className="space-y-3">
      {research.findings.map((f, i) => (
        <li key={i} className="rounded-xl border border-[#EEF2F7] p-3">
          <p className="text-sm font-semibold text-[#0B1C30]">{f.title}</p>
          {f.text && <p className="text-sm text-[#464555]">{f.text}</p>}
          <Source url={f.source} />
        </li>
      ))}
    </ul>
  );
}

function Source({ url }: { url: string }) {
  if (!/^https?:/.test(url)) return <span className="mt-1 block text-xs text-[#94A3B8]">From {url}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1 flex w-fit items-center gap-1 text-xs text-[#777587] hover:text-primary">
      <Icon icon="lucide:link" className="w-3 h-3" aria-hidden /> From {hostOf(url)}
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-[#777587]">{title}</h3>
      <div className="mt-1.5 text-[15px] leading-6 text-[#0B1C30]">{children}</div>
    </div>
  );
}

function Profile({ profile, socials }: { profile: BrandProfile; socials: PublicBrandResearch['socials'] }) {
  const kit = profile.brandKit;
  const fonts = [kit.headingFont, kit.bodyFont].filter(Boolean) as string[];
  return (
    <div className="space-y-6">
      {fonts.length > 0 && (
        <link
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&')}&display=swap`}
          precedence="default"
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Section title="Your business">
          {profile.summary}
          {profile.location && <span className="block text-sm text-[#777587]">{profile.location}</span>}
          {profile.offerings.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {profile.offerings.map((o) => (
                <span key={o} className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-xs font-semibold text-[#0B1C30]">
                  {o}
                </span>
              ))}
            </span>
          )}
        </Section>
        <Section title="Your customers">{profile.audience}</Section>
        <Section title="How you sound">{profile.voice}</Section>
        {profile.goals.length > 0 && (
          <Section title="Your goals">
            <ul className="list-disc pl-5">
              {profile.goals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Brand kit */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8F9FF] p-5">
        <h3 className="text-base font-bold text-[#0B1C30]">Your brand kit</h3>
        <div className="mt-4 grid gap-5 sm:grid-cols-[140px_1fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-[#777587]">Logo</p>
            <div className="mt-2 grid h-28 w-28 place-items-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-[conic-gradient(#f1f5f9_25%,#fff_0_50%,#f1f5f9_0_75%,#fff_0)] bg-[length:16px_16px]">
              {kit.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kit.logoUrl} alt={`${profile.brandName} logo`} className="max-h-24 max-w-24 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <span className="px-2 text-center text-xs text-[#777587]">No logo found</span>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-[#777587]">Colours</p>
              {kit.colors.length ? (
                <div className="mt-2 flex flex-wrap gap-3">
                  {kit.colors.map((c) => (
                    <div key={c.hex} className="text-center">
                      <span className="block h-14 w-14 rounded-xl border border-black/10 shadow-sm" style={{ background: c.hex }} aria-hidden />
                      <span className="mt-1 block text-[11px] font-semibold text-[#0B1C30]">{c.name}</span>
                      <span className="block text-[11px] uppercase text-[#777587]">{c.hex}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-[#777587]">No colours found</p>
              )}
            </div>
            {fonts.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#777587]">Fonts</p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
                  {kit.headingFont && (
                    <span className="text-2xl text-[#0B1C30]" style={{ fontFamily: `"${kit.headingFont}", serif` }}>
                      {kit.headingFont}
                    </span>
                  )}
                  {kit.bodyFont && (
                    <span className="text-sm text-[#464555]" style={{ fontFamily: `"${kit.bodyFont}", sans-serif` }}>
                      {kit.bodyFont}: the quick brown fox
                    </span>
                  )}
                </div>
              </div>
            )}
            <p className="text-sm text-[#464555]">
              <span className="font-semibold text-[#0B1C30]">Your look:</span> {kit.look}
            </p>
          </div>
        </div>
      </div>

      {Object.keys(socials).length > 0 && (
        <Section title="Where you are online">
          <span className="flex flex-wrap gap-2">
            {Object.entries(socials).map(([p, url]) => (
              <a
                key={p}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B1C30] hover:border-primary/40"
              >
                <Icon icon={SOCIAL_ICONS[p] ?? 'lucide:link'} className="w-3.5 h-3.5" aria-hidden /> {shortUrl(url!)}
              </a>
            ))}
          </span>
        </Section>
      )}

      {profile.facts.length > 0 && (
        <Section title="What I found, and where">
          <ul className="space-y-2">
            {profile.facts.map((f, i) => (
              <li key={i} className="text-sm">
                {f.text}
                <Source url={f.source} />
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
