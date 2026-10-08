'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useMemo, useState } from 'react';
import type { ChannelDescription, StrategyRecord } from '@/types/strategy';
import { DESCRIPTION_LIMITS, WEEKDAYS, type PlatformId } from '@/lib/models/strategyConstants';
import { regenerateChannelDescription, StrategyAPIError } from '@/lib/api/strategyClient';
import { summariseAges } from './StrategyRail';

const PLATFORM_TABS: Record<PlatformId, { label: string; icon: string }> = {
  youtube: { label: 'YouTube', icon: 'simple-icons:youtube' },
  instagram: { label: 'Instagram', icon: 'simple-icons:instagram' },
  tiktok: { label: 'TikTok', icon: 'simple-icons:tiktok' },
  linkedin: { label: 'LinkedIn', icon: 'simple-icons:linkedin' },
  x: { label: 'X', icon: 'simple-icons:x' },
  facebook: { label: 'Facebook', icon: 'simple-icons:facebook' },
};

// The five parts of the description formula, with the Stitch highlight colours
const PARTS: { key: keyof Omit<ChannelDescription, 'platform'>; label: string; highlight: string; badge: string; dot: string; underline: string }[] = [
  { key: 'hook', label: 'Hook', highlight: 'bg-[#e2dfff] text-[#3323cc]', badge: 'bg-[#4f46e5] text-white', dot: 'bg-[#4f46e5]', underline: 'decoration-[#3525cd]/40' },
  { key: 'audience', label: 'Audience', highlight: 'bg-[#e5eeff] text-[#004d70]', badge: 'bg-[#006693] text-white', dot: 'bg-[#006693]', underline: 'decoration-[#004d70]/40' },
  { key: 'content', label: 'Content', highlight: 'bg-[#c9e6ff] text-[#004d70]', badge: 'bg-[#004d70] text-white', dot: 'bg-[#004d70]', underline: 'decoration-[#006693]/50' },
  { key: 'value', label: 'Value', highlight: 'bg-[#f0dbff] text-[#2c0051]', badge: 'bg-[#9c48ea] text-[#fffbff]', dot: 'bg-[#9c48ea]', underline: 'decoration-[#8127cf]/40' },
  { key: 'cta', label: 'Call to action', highlight: 'bg-[#ddb7ff]/40 text-[#2c0051]', badge: 'bg-[#8127cf] text-white', dot: 'bg-[#8127cf]', underline: 'decoration-[#8127cf]/40' },
];

const SKILL_CHIPS = { beginner: '🌱 Beginners', intermediate: '🌿 Intermediate', pro: '🌳 Pros' } as const;

const PRIORITY_BADGES = {
  high: { label: 'Primary', style: 'bg-[#e2dfff] text-[#3525cd]' },
  medium: { label: 'Repurpose', style: 'bg-[#f0dbff] text-[#6900b3]' },
  low: { label: 'Optional', style: 'bg-[#e5eeff] text-[#464555]' },
} as const;

const ENGAGEMENT_ICONS = ['material-symbols:chat-bubble-outline', 'material-symbols:playlist-play', 'material-symbols:ballot-outline', 'material-symbols:reply'];
const IMAGE_ICONS = ['material-symbols:photo-camera-outline', 'material-symbols:title', 'material-symbols:wb-sunny-outline', 'material-symbols:sentiment-satisfied-outline'];

const LABEL_MD = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold';
const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';
const CARD = 'bg-white rounded-2xl p-6 shadow-sm flex flex-col';

function joinParts(d: ChannelDescription): string {
  return PARTS.map((p) => d[p.key].trim())
    .filter(Boolean)
    .join(' ');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Wrap each keyword occurrence in an underlined <ins> */
function Highlighted({ text, keywords, underline }: { text: string; keywords: string[]; underline: string }) {
  const clean = keywords.filter(Boolean).sort((a, b) => b.length - a.length);
  if (clean.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${clean.map(escapeRegExp).join('|')})`, 'gi');
  return (
    <>
      {text.split(pattern).map((piece, i) =>
        clean.some((k) => k.toLowerCase() === piece.toLowerCase()) ? (
          <ins key={i} className={`font-bold underline ${underline}`}>
            {piece}
          </ins>
        ) : (
          <span key={i} className="text-inherit">
            {piece}
          </span>
        )
      )}
    </>
  );
}

function CardTitle({ icon, iconStyle, title }: { icon: string; iconStyle: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconStyle}`}>
        <Icon icon={icon} width={18} height={18} />
      </span>
      <h3 className="text-[20px] leading-[28px] tracking-[-0.02em] font-semibold text-[#0b1c30]">{title}</h3>
    </div>
  );
}

function IconList({ items, icons, iconClass }: { items: string[]; icons: string[]; iconClass: string }) {
  return (
    <ul className="flex flex-col gap-2.5 mt-4">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px] leading-[22px] text-[#0b1c30]">
          <Icon icon={icons[i % icons.length]} width={18} height={18} className={`shrink-0 mt-0.5 ${iconClass}`} />
          <span className="text-inherit">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ResultView({ strategy }: { strategy: StrategyRecord }) {
  const output = strategy.strategyOutput;
  const quiz = strategy.quiz;
  const [descriptions, setDescriptions] = useState<ChannelDescription[]>(output.channelDescriptions ?? []);
  const [activePlatform, setActivePlatform] = useState<PlatformId | null>(descriptions[0]?.platform ?? null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const active = descriptions.find((d) => d.platform === activePlatform) ?? null;
  const text = active ? joinParts(active) : '';
  const limit = activePlatform ? DESCRIPTION_LIMITS[activePlatform] : 1000;
  const keywords = useMemo(() => (quiz ? [quiz.primary_keyword, ...quiz.secondary_keywords] : []), [quiz]);
  const primaryInFirst100 = quiz ? text.slice(0, 100).toLowerCase().includes(quiz.primary_keyword.toLowerCase()) : false;

  const firstNiche = quiz?.niches[0] ?? null;
  const ageSummary = quiz ? summariseAges(quiz.age_ranges) : null;
  const audienceChip = quiz?.skill_level ? `${SKILL_CHIPS[quiz.skill_level]}${ageSummary ? ` ${ageSummary}` : ''}` : ageSummary;

  const regenerate = async () => {
    if (!activePlatform) return;
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const fresh = await regenerateChannelDescription(strategy.id, activePlatform);
      setDescriptions((current) => current.map((d) => (d.platform === fresh.platform ? fresh : d)));
    } catch (err) {
      setRegenerateError(err instanceof StrategyAPIError ? err.message : 'Regenerating the description failed. Please try again.');
    } finally {
      setRegenerating(false);
    }
  };

  const copy = async () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };
    try {
      await navigator.clipboard.writeText(text);
      done();
      return;
    } catch {
      // Some browsers and embedded views refuse the Clipboard API; fall back below
    }
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    if (ok) done();
    else setRegenerateError('Couldn’t copy automatically. Select the text and copy it instead.');
  };

  const scheduleDays = output.schedule?.days ?? [];
  const postsPerWeek = quiz?.cadence ?? scheduleDays.length;

  return (
    <div className="flex flex-col w-full max-w-[1280px] mx-auto gap-6 font-heading">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[28px] leading-[36px] tracking-[-0.025em] font-bold text-[#0b1c30]">{strategy.brandName}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {firstNiche && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2dfff] text-[#3525cd] ${LABEL_MD}`}>
                <span className="text-sm">{firstNiche.emoji}</span>
                <span className="text-inherit">{quiz!.niches.map((n) => n.label).join(' · ')}</span>
              </span>
            )}
            {audienceChip && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#eff4ff] text-[#006693] ${LABEL_MD}`}>{audienceChip}</span>
            )}
            {!quiz && <span className={`px-3 py-1 rounded-full bg-[#eff4ff] text-[#006693] ${LABEL_MD}`}>{strategy.industry}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {quiz && (
            <Link
              href={`/dashboard/strategist/new?edit=${encodeURIComponent(strategy.id)}`}
              className={`inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#0b1c30] rounded-xl shadow-sm hover:bg-[#e5eeff] transition-all active:scale-[0.98] ${LABEL_MD}`}
            >
              <Icon icon="material-symbols:tune" width={18} height={18} className="text-[#777587]" />
              <span className="text-inherit">Edit answers</span>
            </Link>
          )}
          {saved ? (
            <Link
              href="/dashboard/strategist"
              className={`inline-flex items-center gap-1.5 px-4 py-2 bg-[#e2dfff] text-[#3525cd] rounded-xl shadow-sm hover:opacity-95 transition-all ${LABEL_MD}`}
            >
              <Icon icon="material-symbols:check" width={18} height={18} />
              <span className="text-inherit">Saved · View all</span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setSaved(true)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 bg-[#4f46e5] text-white rounded-xl shadow-sm hover:opacity-95 transition-all active:scale-[0.98] ${LABEL_MD}`}
            >
              <Icon icon="material-symbols:bookmark-outline" width={18} height={18} />
              <span className="text-inherit">Save strategy</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero: channel descriptions */}
      <div className="w-full bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col">
        <h2 className="text-[20px] leading-[28px] tracking-[-0.02em] font-semibold text-[#0b1c30] mb-4">Channel descriptions</h2>

        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-6" role="tablist" aria-label="Platforms">
              {descriptions.map((d) => {
                const tab = PLATFORM_TABS[d.platform];
                const selected = d.platform === activePlatform;
                return (
                  <button
                    key={d.platform}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => {
                      setActivePlatform(d.platform);
                      setRegenerateError(null);
                    }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${LABEL_MD} ${
                      selected ? 'bg-[#4f46e5] text-white shadow-sm' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                    }`}
                  >
                    <Icon icon={tab.icon} width={16} height={16} />
                    <span className="text-inherit">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              className={`p-6 bg-[#eff4ff] rounded-xl text-[16px] tracking-[-0.01em] text-[#0b1c30] leading-[1.8] my-2 select-text transition-opacity ${regenerating ? 'opacity-50' : ''}`}
              role="tabpanel"
              aria-busy={regenerating}
            >
              {PARTS.map((p, i) =>
                active[p.key].trim() ? (
                  <span key={p.key} className={`${p.highlight} px-2 py-1 rounded inline mx-0.5 [box-decoration-break:clone]`}>
                    <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full mr-1 text-[12px] leading-[16px] font-semibold ${p.badge}`}>{i + 1}</span>
                    <Highlighted text={active[p.key]} keywords={keywords} underline={p.underline} />
                  </span>
                ) : null
              )}
            </div>

            <div className={`flex flex-wrap items-center gap-6 text-[#464555] py-3 mt-1 ${LABEL_SM}`}>
              {PARTS.map((p) => (
                <div key={p.key} className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />
                  <span className="text-inherit">{p.label}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-[#eff4ff]/30 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 max-w-lg">
                <div className="flex flex-col gap-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <span className={`${LABEL_SM} ${text.length > limit ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'}`}>
                      {text.length.toLocaleString()} / {limit.toLocaleString()}
                    </span>
                    <span className={`${LABEL_SM} text-[#c7c4d8]`}>{PLATFORM_TABS[active.platform].label} description</span>
                  </div>
                  <div className="w-full h-2 bg-[#e5eeff] rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full ${text.length > limit ? 'bg-[#ba1a1a]' : 'bg-[#4f46e5]'}`}
                      style={{ width: `${Math.min(100, (text.length / limit) * 100)}%` }}
                    />
                  </div>
                </div>
                {active.platform === 'youtube' ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap ${LABEL_SM} ${
                      primaryInFirst100 ? 'bg-[#e5eeff] text-[#004d70]' : 'bg-[#ffdad6] text-[#93000a]'
                    }`}
                  >
                    <Icon icon={primaryInFirst100 ? 'material-symbols:check-circle-outline' : 'material-symbols:error-outline'} width={14} height={14} />
                    <span className="text-inherit">{primaryInFirst100 ? 'First 100 characters show in search' : 'Main keyword isn’t in the first 100 characters'}</span>
                  </span>
                ) : (
                  text.length <= limit && (
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full whitespace-nowrap bg-[#e5eeff] text-[#004d70] ${LABEL_SM}`}>
                      <Icon icon="material-symbols:check-circle-outline" width={14} height={14} />
                      <span className="text-inherit">Fits the {limit}-character limit</span>
                    </span>
                  )
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={regenerate}
                  disabled={regenerating}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#0b1c30] rounded-xl shadow-sm hover:bg-[#e5eeff] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-wait ${LABEL_MD}`}
                >
                  <Icon icon="material-symbols:refresh" width={16} height={16} className={`text-[#777587] ${regenerating ? 'animate-spin' : ''}`} />
                  <span className="text-inherit">{regenerating ? 'Regenerating…' : 'Regenerate'}</span>
                </button>
                <button
                  type="button"
                  onClick={copy}
                  className={`inline-flex items-center gap-1.5 px-5 py-2 bg-[#4f46e5] text-white rounded-xl shadow-sm hover:opacity-95 transition-all active:scale-[0.98] ${LABEL_MD}`}
                >
                  <Icon icon={copied ? 'material-symbols:check' : 'material-symbols:content-copy-outline'} width={16} height={16} />
                  <span className="text-inherit">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>
            {regenerateError && (
              <p className={`${LABEL_MD} text-[#ba1a1a] mt-3`} role="alert">
                {regenerateError}
              </p>
            )}
          </>
        ) : (
          <p className="text-[14px] leading-[22px] text-[#464555]">
            This strategy was created before channel descriptions were available.{' '}
            <Link href="/dashboard/strategist/new" className="font-semibold text-[#3525cd] hover:underline">
              Build a new strategy
            </Link>{' '}
            to get SEO-ready descriptions for each platform.
          </p>
        )}
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className={CARD}>
          <CardTitle icon="material-symbols:view-column-outline" iconStyle="bg-[#e2dfff] text-[#3525cd]" title="Content pillars" />
          <IconList items={output.contentPillars} icons={['material-symbols:check-circle-outline']} iconClass="text-[#3525cd]" />
        </div>

        <div className={CARD}>
          <CardTitle icon="material-symbols:calendar-today-outline" iconStyle="bg-[#e5eeff] text-[#3525cd]" title="Posting schedule" />
          {output.schedule ? (
            <>
              <div className="flex items-center justify-between gap-1 mt-4 mb-4" aria-label="Posting days">
                {WEEKDAYS.map((day) => {
                  const on = scheduleDays.includes(day);
                  return (
                    <span
                      key={day}
                      title={day}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${LABEL_MD} ${on ? 'bg-[#4f46e5] text-white shadow-sm' : 'bg-[#e5eeff] text-[#777587]'}`}
                    >
                      {day[0]}
                    </span>
                  );
                })}
              </div>
              <ul className="flex flex-col gap-2 mt-2 text-[14px] leading-[22px] text-[#0b1c30]">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0" />
                  <span className="text-inherit">
                    <strong className="font-bold">{postsPerWeek} posts per week</strong> ({scheduleDays.join(', ')})
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0" />
                  <span className="text-inherit">
                    Best time: <strong className="font-bold">{output.schedule.best_time}</strong>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0" />
                  <span className="text-inherit">Focus: {output.schedule.focus}</span>
                </li>
              </ul>
            </>
          ) : (
            <p className="text-[14px] leading-[22px] text-[#0b1c30] mt-4">{output.postingSchedule}</p>
          )}
        </div>

        <div className={CARD}>
          <CardTitle icon="material-symbols:hub-outline" iconStyle="bg-[#e5eeff] text-[#3525cd]" title="Platforms" />
          <div className="flex flex-col gap-3 mt-4">
            {output.platformRecommendations.map((p) => {
              const badge = PRIORITY_BADGES[p.priority];
              const name = PLATFORM_TABS[p.platform.toLowerCase() as PlatformId]?.label ?? p.platform;
              return (
                <div key={p.platform} className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#eff4ff]">
                  <div className="flex items-center gap-2">
                    <span className={`${LABEL_MD} font-bold text-[#0b1c30]`}>{name}</span>
                    <span className={`px-2 py-0.5 rounded-full ${LABEL_SM} ${badge.style}`}>{badge.label}</span>
                  </div>
                  <p className="text-[14px] leading-[22px] text-[#464555]">{p.rationale}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className={CARD}>
          <CardTitle icon="material-symbols:interests-outline" iconStyle="bg-[#f0dbff] text-[#8127cf]" title="Content themes" />
          <IconList items={output.contentThemes} icons={['material-symbols:tag']} iconClass="text-[#8127cf]" />
        </div>

        <div className={CARD}>
          <CardTitle icon="material-symbols:forum-outline" iconStyle="bg-[#e5eeff] text-[#006693]" title="Engagement ideas" />
          <IconList items={output.engagementTactics} icons={ENGAGEMENT_ICONS} iconClass="text-[#004d70]" />
        </div>

        <div className={CARD}>
          <CardTitle icon="material-symbols:image-outline" iconStyle="bg-[#dce9ff] text-[#3525cd]" title="Image ideas" />
          <IconList items={output.visualPrompts} icons={IMAGE_ICONS} iconClass="text-[#777587]" />
        </div>
      </div>
    </div>
  );
}
