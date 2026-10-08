'use client';

import { Icon } from '@iconify/react';
import type { PlatformId } from './BrandStep';
import { PLATFORM_BADGES, getInitials, type Niche, type NicheTopic } from './NicheStep';
import type { SkillLevel } from './AudienceStep';

const SKILL_LABELS: Record<SkillLevel, string> = {
  beginner: '🌱 Beginner',
  intermediate: '🌿 Intermediate',
  pro: '🌳 Pro',
};

/** "25–34" + "35–44" -> "25–44" */
function summariseAges(ages: string[]): string | null {
  if (ages.length === 0) return null;
  if (ages.length === 1) return ages[0];
  const first = ages[0].split('–')[0];
  const last = ages[ages.length - 1];
  return last.endsWith('+') ? `${first}+` : `${first}–${last.split('–')[1]}`;
}

const SECTION_LABEL = 'text-[11px] font-semibold tracking-[0.08em] uppercase text-[#464555]';
const CHIP = 'px-3 py-1 rounded-full bg-[#eff4ff] text-[13px] font-medium text-[#0b1c30]';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className={SECTION_LABEL}>{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Empty() {
  return <span className="h-6 w-24 rounded-full bg-slate-100" aria-label="Not answered yet" />;
}

export interface StrategySummary {
  brandName: string;
  platforms: PlatformId[];
  niches: Niche[];
  topics: NicheTopic[];
  ages: string[];
  skill: SkillLevel | null;
  interests: string[];
  struggles: string[];
  contentTypes: { id: string; label: string }[];
  cadence: number;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  goal: { emoji: string; label: string } | null;
}

/** Live "Your strategy" summary shown beside the later quiz steps */
export function StrategyRail({ summary }: { summary: StrategySummary }) {
  const ageSummary = summariseAges(summary.ages);

  return (
    <aside className="bg-white rounded-2xl shadow-sm border border-[#c7c4d8]/20 p-6 flex flex-col gap-5" aria-label="Your strategy">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-[0.08em] uppercase text-[#3525cd]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3525cd]" aria-hidden="true" />
          <span className="text-inherit">Your Strategy</span>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[12px] font-medium text-[#464555]">Live Preview</span>
      </div>

      {/* Channel profile */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#eff4ff]">
        <div className="w-11 h-11 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-semibold text-sm shrink-0">
          {getInitials(summary.brandName)}
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[15px] font-semibold text-[#0b1c30] truncate">{summary.brandName}</span>
          <span className="text-[13px] text-[#464555]">Channel profile</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {summary.platforms.map((id) => {
            const badge = PLATFORM_BADGES[id];
            return (
              <div key={id} className={`w-7 h-7 rounded-lg flex items-center justify-center ${badge.style}`} title={badge.label}>
                <Icon icon={badge.icon} width={14} height={14} />
              </div>
            );
          })}
        </div>
      </div>

      <Section label="Niche">
        {summary.niches.length ? (
          summary.niches.map((n) => {
            const picked = summary.topics.filter((t) => t.niche === n.label).map((t) => t.topic);
            return (
              <span key={n.label} className={CHIP}>
                {n.emoji} {n.label}
                {picked.length ? ` › ${picked.join(', ')}` : ''}
              </span>
            );
          })
        ) : (
          <Empty />
        )}
      </Section>

      <Section label="Audience">
        {ageSummary && <span className={CHIP}>👥 {ageSummary}</span>}
        {summary.skill && <span className={CHIP}>{SKILL_LABELS[summary.skill]}</span>}
        {!ageSummary && !summary.skill && <Empty />}
      </Section>

      {summary.interests.length > 0 && (
        <Section label="Interests">
          {summary.interests.map((i) => (
            <span key={i} className={CHIP}>
              {i}
            </span>
          ))}
        </Section>
      )}

      {summary.struggles.length > 0 && (
        <Section label="Struggles">
          {summary.struggles.map((s) => (
            <span key={s} className={CHIP}>
              {s}
            </span>
          ))}
        </Section>
      )}

      {/* Content */}
      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#e5eeff]">
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#3525cd]">Content</span>
          <span className="text-[12px] font-semibold text-[#3525cd]">Active Stage</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {summary.contentTypes.map((c) => (
            <span key={c.id} className="px-3 py-1 rounded-full bg-white text-[13px] font-medium text-[#3525cd]">
              {c.label}
            </span>
          ))}
          <span className="px-3 py-1 rounded-full bg-[#4f46e5] text-[13px] font-semibold text-white">{summary.cadence}× / week</span>
        </div>
      </div>

      {/* Keywords */}
      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#e5eeff]">
        <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#3525cd]">Keywords</span>
        <div className="flex flex-wrap gap-1.5">
          {summary.primaryKeyword && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#4f46e5] text-[13px] font-medium text-white">
              <Icon icon="material-symbols:star" width={12} height={12} />
              <span className="text-inherit">{summary.primaryKeyword}</span>
            </span>
          )}
          {summary.secondaryKeywords.map((k) => (
            <span key={k} className="px-3 py-1 rounded-full bg-white text-[13px] font-medium text-[#0b1c30]">
              {k}
            </span>
          ))}
          {!summary.primaryKeyword && summary.secondaryKeywords.length === 0 && <span className="h-6 w-28 rounded-full bg-white/70" />}
        </div>
      </div>

      {/* Goal */}
      <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#e5eeff]">
        <span className="text-[12px] font-bold tracking-[0.08em] uppercase text-[#3525cd]">Goal</span>
        <div className="flex flex-wrap gap-1.5">
          {summary.goal ? (
            <span className="px-3 py-1 rounded-full bg-white text-[13px] font-medium text-[#3525cd]">
              {summary.goal.emoji} {summary.goal.label}
            </span>
          ) : (
            <span className="h-6 w-28 rounded-full bg-white/70" />
          )}
        </div>
      </div>
    </aside>
  );
}
