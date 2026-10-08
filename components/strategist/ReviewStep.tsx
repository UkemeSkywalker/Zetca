'use client';

import { Icon } from '@iconify/react';
import { useEffect } from 'react';
import type { PlatformId } from './BrandStep';
import type { Niche, NicheTopic } from './NicheStep';
import type { SkillLevel } from './AudienceStep';
import { summariseAges } from './StrategyRail';

export type ReviewSection = 'brand' | 'niche' | 'audience' | 'content';

const PLATFORM_CHIPS: Record<PlatformId, { label: string; style: string; iconColor: string; icon?: string; glyph?: string }> = {
  youtube: { label: 'YouTube', style: 'bg-[#ffdad6] text-[#93000a]', iconColor: 'text-[#ba1a1a]', icon: 'material-symbols:smart-display' },
  instagram: { label: 'Instagram', style: 'bg-[#f0dbff] text-[#6900b3]', iconColor: 'text-[#8127cf]', icon: 'material-symbols:photo-camera-outline' },
  tiktok: { label: 'TikTok', style: 'bg-slate-100 text-slate-800', iconColor: 'text-slate-900', icon: 'material-symbols:music-note' },
  linkedin: { label: 'LinkedIn', style: 'bg-[#c9e6ff] text-[#004c6e]', iconColor: 'text-[#0A66C2]', icon: 'material-symbols:work-outline' },
  x: { label: 'X', style: 'bg-slate-100 text-slate-900', iconColor: 'text-black', glyph: '𝕏' },
  facebook: { label: 'Facebook', style: 'bg-[#c9e6ff] text-[#004c6e]', iconColor: 'text-[#1877F2]', icon: 'material-symbols:groups-outline' },
};

const SKILL_CHIPS: Record<SkillLevel, { emoji: string; label: string }> = {
  beginner: { emoji: '🌱', label: 'Beginner' },
  intermediate: { emoji: '🌿', label: 'Intermediate' },
  pro: { emoji: '🌳', label: 'Pro' },
};

const LABEL_MD = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold';
const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

function Pillar({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#dce9ff]/60 flex flex-col divide-y divide-[#e5eeff] overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-5 py-3.5 bg-[#eff4ff]/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full bg-[#e2dfff] text-[#3525cd] flex items-center justify-center ${LABEL_SM}`}>{number}</span>
          <span className="text-[14px] leading-[22px] font-bold text-[#0b1c30]">{title}</span>
        </div>
        <span className={`${LABEL_SM} text-[#777587] uppercase tracking-wider`}>Phase {number}</span>
      </div>
      {children}
    </div>
  );
}

function Row({ icon, label, onEdit, children }: { icon: string; label: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="p-5 flex flex-col justify-between gap-3 grow hover:bg-[#eff4ff]/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon={icon} width={20} height={20} className="text-[#777587]" />
          <span className={`${LABEL_MD} !font-medium text-[#464555]`}>{label}</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${label.toLowerCase()}`}
          className={`inline-flex items-center gap-1 ${LABEL_MD} text-[#3525cd] hover:text-[#3323cc] transition-colors`}
        >
          <Icon icon="material-symbols:edit-outline" width={16} height={16} />
          <span className="text-inherit">Edit</span>
        </button>
      </div>
      {children}
    </div>
  );
}

interface ReviewStepProps {
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
  generating: boolean;
  error: string | null;
  onEdit: (section: ReviewSection) => void;
  onBack: () => void;
  onGenerate: () => void;
}

export function ReviewStep(props: ReviewStepProps) {
  const { generating, error, onEdit, onBack, onGenerate } = props;
  const ageSummary = summariseAges(props.ages);

  // Enter generates, unless a button has focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || generating) return;
      if (document.activeElement?.tagName === 'BUTTON') return;
      onGenerate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [generating, onGenerate]);

  return (
    <div className="w-full flex flex-col items-center">
      {/* Header */}
      <div className="mb-3 flex justify-center">
        <div className={`inline-flex items-center gap-1 px-4 py-2 rounded-full bg-[#e2dfff] text-[#3525cd] shadow-sm ${LABEL_MD}`}>
          <Icon icon="material-symbols:arrow-back-ios-new" width={18} height={18} className="text-[#3525cd]" />
          <span className="text-[#3323cc]">Looking great! Check everything before we build.</span>
        </div>
      </div>
      <h1 className="text-[36px] leading-[44px] tracking-[-0.03em] font-bold text-[#0b1c30] mb-8 text-center">Review your answers</h1>

      {/* Stage timeline */}
      <div className="w-full relative mb-8 hidden md:block" aria-hidden="true">
        <div className="absolute top-1/2 left-12 right-12 h-0.5 bg-[#d3e4fe] -translate-y-1/2 z-0" />
        <div className="relative z-10 flex justify-between px-6">
          {['Foundation', 'Target Persona', 'Content & Engine'].map((stage, i) => (
            <div key={stage} className="flex items-center gap-2 bg-[#f8f9ff] px-3 py-1 rounded-full border border-[#dce9ff]">
              <span className={`w-6 h-6 rounded-full bg-[#3525cd] text-white flex items-center justify-center ${LABEL_SM}`}>{i + 1}</span>
              <span className={`${LABEL_MD} text-[#0b1c30]`}>{stage}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Three pillars */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <Pillar number={1} title="Foundation">
          <Row icon="material-symbols:badge-outline" label="Brand" onEdit={() => onEdit('brand')}>
            <div className="flex flex-col gap-2">
              <span className="text-[16px] leading-[26px] tracking-[-0.01em] text-[#0b1c30] font-semibold truncate">{props.brandName}</span>
              <div className="flex items-center flex-wrap gap-1.5">
                {props.platforms.map((id) => {
                  const p = PLATFORM_CHIPS[id];
                  return (
                    <span key={id} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${p.style} ${LABEL_SM}`}>
                      {p.icon ? (
                        <Icon icon={p.icon} width={14} height={14} className={p.iconColor} />
                      ) : (
                        <span className={`text-[12px] font-black ${p.iconColor}`}>{p.glyph}</span>
                      )}
                      <span className="text-inherit">{p.label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </Row>
          <Row icon="material-symbols:explore-outline" label="Niche" onEdit={() => onEdit('niche')}>
            <div className="flex items-center flex-wrap gap-2">
              {props.niches.map((n) => {
                const picked = props.topics.filter((t) => t.niche === n.label).map((t) => t.topic);
                return (
                  <span key={n.label} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#dce9ff] text-[#0b1c30] ${LABEL_MD}`}>
                    <span>{n.emoji}</span>
                    <span className="font-medium text-inherit">
                      {n.label}
                      {picked.length ? ` › ${picked.join(', ')}` : ''}
                    </span>
                  </span>
                );
              })}
            </div>
          </Row>
        </Pillar>

        <Pillar number={2} title="Target Persona">
          <Row icon="material-symbols:group-outline" label="Audience" onEdit={() => onEdit('audience')}>
            <div className="flex items-center flex-wrap gap-2">
              {ageSummary && <span className={`px-3 py-1.5 rounded-full bg-[#c9e6ff] text-[#004c6e] ${LABEL_MD}`}>{ageSummary}</span>}
              {props.skill && (
                <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#d3e4fe] text-[#0b1c30] ${LABEL_MD}`}>
                  <span>{SKILL_CHIPS[props.skill].emoji}</span>
                  <span className="font-medium text-inherit">{SKILL_CHIPS[props.skill].label}</span>
                </span>
              )}
            </div>
          </Row>
          <Row icon="material-symbols:favorite-outline" label="Interests & struggles" onEdit={() => onEdit('audience')}>
            <div className="flex items-center flex-wrap gap-1.5">
              {props.interests.map((i) => (
                <span key={i} className={`px-3 py-1 rounded-full bg-[#e2dfff] text-[#3323cc] ${LABEL_MD}`}>
                  {i}
                </span>
              ))}
              {props.struggles.map((s) => (
                <span key={s} className={`px-3 py-1 rounded-full bg-[#ffdad6] text-[#93000a] ${LABEL_MD}`}>
                  {s}
                </span>
              ))}
              {props.interests.length === 0 && props.struggles.length === 0 && (
                <span className="text-[14px] leading-[22px] text-[#777587]">None added</span>
              )}
            </div>
          </Row>
        </Pillar>

        <Pillar number={3} title="Content & Engine">
          <Row icon="material-symbols:grid-view-outline" label="Content" onEdit={() => onEdit('content')}>
            <div className="flex items-center flex-wrap gap-1.5">
              {props.contentTypes.map((c) => (
                <span key={c.id} className={`px-3 py-1 rounded-full bg-[#e5eeff] text-[#464555] ${LABEL_MD}`}>
                  {c.label.split(' / ')[0]}
                </span>
              ))}
              <span className={`px-3 py-1 rounded-full bg-[#4f46e5] text-white ${LABEL_MD}`}>{props.cadence}× / week</span>
            </div>
          </Row>
          <Row icon="material-symbols:flag-outline" label="Keywords & goal" onEdit={() => onEdit('content')}>
            <div className="flex items-center flex-wrap gap-1.5">
              {props.primaryKeyword && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#4f46e5] text-white ${LABEL_MD}`}>
                  <span>★</span>
                  <span className="text-inherit">{props.primaryKeyword}</span>
                </span>
              )}
              {props.secondaryKeywords.length > 0 && (
                <span
                  className={`px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#464555] ${LABEL_SM}`}
                  title={props.secondaryKeywords.join(', ')}
                >
                  +{props.secondaryKeywords.length} more
                </span>
              )}
              {props.goal && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e2dfff] text-[#3323cc] ${LABEL_MD} !font-medium`}>
                  <span>{props.goal.emoji}</span>
                  <span className="text-inherit">{props.goal.label}</span>
                </span>
              )}
            </div>
          </Row>
        </Pillar>
      </div>

      {/* Launch */}
      <div className="w-full max-w-[640px] flex flex-col items-center">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className={`h-14 w-full bg-[#4f46e5] hover:bg-[#3525cd] active:scale-[0.99] text-white text-[16px] leading-[26px] font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 ${
            generating ? 'opacity-90 pointer-events-none' : 'cursor-pointer'
          }`}
        >
          {generating ? (
            <>
              <Icon icon="material-symbols:progress-activity" width={20} height={20} className="animate-spin" />
              <span className="text-inherit">Synthesizing your AI Strategy...</span>
            </>
          ) : (
            <>
              <Icon icon="material-symbols:auto-awesome" width={20} height={20} />
              <span className="text-inherit">Generate my strategy</span>
            </>
          )}
        </button>
        {error ? (
          <p className={`${LABEL_MD} text-[#ba1a1a] text-center mt-2`} role="alert">
            {error}
          </p>
        ) : (
          <span className={`${LABEL_SM} text-[#777587] text-center mt-2`}>Takes about 30 seconds</span>
        )}
        <button
          type="button"
          onClick={onBack}
          disabled={generating}
          className={`${LABEL_MD} text-[#464555] hover:text-[#0b1c30] transition-colors py-2 px-3 inline-flex items-center justify-center gap-1 mt-4 disabled:opacity-50`}
        >
          <Icon icon="material-symbols:arrow-back" width={16} height={16} />
          <span className="text-inherit">Back</span>
        </button>
      </div>
    </div>
  );
}
