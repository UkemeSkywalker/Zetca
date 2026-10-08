'use client';

import { Icon } from '@iconify/react';
import { useEffect, useMemo, useState } from 'react';
import type { PlatformId } from './BrandStep';
import type { Niche, NicheTopic } from './NicheStep';
import type { SkillLevel } from './AudienceStep';
import { StrategyRail } from './StrategyRail';
import { ruleBasedKeywords } from '@/lib/strategist/keywords';
import { suggestKeywords } from '@/lib/api/strategyClient';
import {
  CONTENT_TYPE_CATEGORIES,
  CUSTOM_CONTENT_TYPE_ICON,
  CUSTOM_CONTENT_TYPE_ICON_SELECTED,
  MAX_CONTENT_TYPES,
  contentTypeOptions,
  findContentType,
} from '@/lib/strategist/contentTypes';


export type GoalId = 'grow' | 'authority' | 'sell' | 'community';

export const GOALS: { id: GoalId; emoji: string; label: string }[] = [
  { id: 'grow', emoji: '📈', label: 'Grow audience' },
  { id: 'authority', emoji: '🏆', label: 'Build authority' },
  { id: 'sell', emoji: '🛍️', label: 'Sell products' },
  { id: 'community', emoji: '🤝', label: 'Build community' },
];

export const MIN_CADENCE = 1;
export const MAX_CADENCE = 14;
export const MAX_SECONDARY_KEYWORDS = 3;
const BUBBLE_BY_SKILL: Record<SkillLevel, string> = {
  beginner: 'People search for these in your niche & beginners love step-by-step videos!',
  intermediate: 'People search for these in your niche & your audience loves practical tips!',
  pro: 'People search for these in your niche & advanced viewers love deep dives!',
};

const CARD = 'bg-white rounded-2xl shadow-sm border border-[#c7c4d8]/20 p-6 sm:p-7 flex flex-col space-y-6';
const TILE_ON = 'bg-[#e5eeff] text-[#3525cd] shadow-sm hover:shadow-md';
const TILE_OFF = 'bg-white border border-[#c7c4d8]/30 text-[#0b1c30] shadow-sm hover:bg-[#eff4ff]';
const LABEL = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold text-[#0b1c30]';
const TILE_LOCKED = 'bg-white border border-[#c7c4d8]/30 text-[#0b1c30] opacity-40 cursor-not-allowed';
const TILE_BASE = 'group relative flex flex-col items-center justify-center p-3 min-h-[84px] rounded-xl transition-all text-center';
const CATEGORY_LABEL = 'text-[12px] font-bold uppercase tracking-[0.06em] text-slate-400 mb-2.5';

interface ContentStepProps {
  brandName: string;
  platforms: PlatformId[];
  ages: string[];
  interests: string[];
  struggles: string[];
  niches: Niche[];
  topics: NicheTopic[];
  skill: SkillLevel | null;
  contentTypes: string[];
  cadence: number;
  primaryKeyword: string | null;
  secondaryKeywords: string[];
  goal: GoalId | null;
  onContentTypesChange: (types: string[]) => void;
  onCadenceChange: (cadence: number) => void;
  onPrimaryKeywordChange: (keyword: string | null) => void;
  onSecondaryKeywordsChange: (keywords: string[]) => void;
  onGoalChange: (goal: GoalId) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function ContentStep({
  brandName,
  platforms,
  ages,
  interests,
  struggles,
  niches,
  topics,
  skill,
  contentTypes,
  cadence,
  primaryKeyword,
  secondaryKeywords,
  goal,
  onContentTypesChange,
  onCadenceChange,
  onPrimaryKeywordChange,
  onSecondaryKeywordsChange,
  onGoalChange,
  onBack,
  onContinue,
}: ContentStepProps) {
  const fallbackKeywords = useMemo(
    () => ruleBasedKeywords({ niches: niches.map((n) => n.label), topics, skill }),
    [niches, topics, skill]
  );
  const [aiKeywords, setAiKeywords] = useState<string[] | null>(null);
  const [loadingKeywords, setLoadingKeywords] = useState(true);

  // Ask the Keyword agent once per visit; keep the rule-based list if it fails
  useEffect(() => {
    const controller = new AbortController();
    suggestKeywords(
      {
        niches: niches.map((n) => n.label),
        topics,
        skillLevel: skill,
        ageRanges: ages,
        interests,
        struggles,
        platforms,
        contentTypes: [],
      },
      controller.signal
    )
      .then((list) => {
        if (list.length > 0) setAiKeywords(list);
      })
      .catch(() => {
        // Fallback list is already showing
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingKeywords(false);
      });
    return () => controller.abort();
    // Only on entering the step; answers can't change while it's open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep any keyword already picked visible, even if the AI list differs
  const keywords = useMemo(() => {
    const base = aiKeywords ?? fallbackKeywords;
    const picked = [primaryKeyword, ...secondaryKeywords].filter((k): k is string => !!k && !base.includes(k));
    return [...picked, ...base];
  }, [aiKeywords, fallbackKeywords, primaryKeyword, secondaryKeywords]);
  const canContinue = contentTypes.length > 0 && primaryKeyword !== null && goal !== null;
  const secondaryFull = secondaryKeywords.length >= MAX_SECONDARY_KEYWORDS;

  // Enter continues, unless a button has focus
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'BUTTON') return;
      if (canContinue) onContinue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canContinue, onContinue]);

  const typesFull = contentTypes.length >= MAX_CONTENT_TYPES;
  const toggleType = (id: string) => {
    if (contentTypes.includes(id)) onContentTypesChange(contentTypes.filter((t) => t !== id));
    else if (!typesFull) onContentTypesChange([...contentTypes, id]);
  };

  // Types the user typed with "+ Other" stay as tiles after being unticked
  const [customTypes, setCustomTypes] = useState<string[]>(() => contentTypes.filter((t) => !findContentType(t)));
  const [addingType, setAddingType] = useState(false);
  const [newType, setNewType] = useState('');
  const addCustomType = () => {
    const typed = newType.trim();
    setAddingType(false);
    setNewType('');
    if (!typed) return;
    // Typing a preset's name picks the preset
    const preset = CONTENT_TYPE_CATEGORIES.flatMap((c) => c.types).find((c) => c.label.toLowerCase() === typed.toLowerCase());
    const id = preset?.id ?? customTypes.find((c) => c.toLowerCase() === typed.toLowerCase()) ?? typed;
    if (!preset && !customTypes.includes(id)) setCustomTypes([...customTypes, id]);
    if (!contentTypes.includes(id) && !typesFull) onContentTypesChange([...contentTypes, id]);
  };

  const renderTypeTile = (id: string, label: string, icon: string, iconSelected: string) => {
    const selected = contentTypes.includes(id);
    const locked = !selected && typesFull;
    return (
      <button
        key={id}
        type="button"
        aria-pressed={selected}
        disabled={locked}
        onClick={() => toggleType(id)}
        className={`${TILE_BASE} ${selected ? TILE_ON : locked ? TILE_LOCKED : TILE_OFF}`}
      >
        {selected && (
          <span className="absolute top-2 right-2 size-5 rounded-full bg-[#4f46e5] text-white flex items-center justify-center">
            <Icon icon="material-symbols:check" width={12} height={12} />
          </span>
        )}
        <Icon
          icon={selected ? iconSelected : icon}
          width={24}
          height={24}
          className={`mb-1.5 transition-colors ${selected ? 'text-[#3525cd]' : 'text-[#777587] group-hover:text-[#3525cd]'}`}
        />
        <span className={LABEL}>{label}</span>
      </button>
    );
  };

  // Starring a chip makes it the main keyword; tapping it again unstars it
  const starKeyword = (k: string) => {
    if (primaryKeyword === k) {
      onPrimaryKeywordChange(null);
      return;
    }
    onPrimaryKeywordChange(k);
    if (secondaryKeywords.includes(k)) onSecondaryKeywordsChange(secondaryKeywords.filter((s) => s !== k));
  };

  // Tapping the label picks it as one of up to 3 secondary keywords
  const toggleSecondary = (k: string) => {
    if (primaryKeyword === k) return starKeyword(k);
    if (secondaryKeywords.includes(k)) onSecondaryKeywordsChange(secondaryKeywords.filter((s) => s !== k));
    else if (!secondaryFull) onSecondaryKeywordsChange([...secondaryKeywords, k]);
  };

  const goalInfo = GOALS.find((g) => g.id === goal) ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: live strategy summary */}
      <div className="lg:col-span-4 lg:sticky lg:top-[102px]">
        <StrategyRail
          summary={{
            brandName,
            platforms,
            niches,
            topics,
            ages,
            skill,
            interests,
            struggles,
            contentTypes: contentTypeOptions(contentTypes),
            cadence,
            primaryKeyword,
            secondaryKeywords,
            goal: goalInfo ? { emoji: goalInfo.emoji, label: goalInfo.label } : null,
          }}
        />
      </div>

    <section className="lg:col-span-8 flex flex-col space-y-6 w-full">
      {/* AI insight bubble */}
      <div className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl bg-[#eff4ff] border border-[#c7c4d8]/20 shadow-sm">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center shadow-sm">
          <Icon icon="material-symbols:auto-awesome" width={18} height={18} />
        </div>
        <p className="text-[15px] leading-[22px] text-[#0b1c30]">{BUBBLE_BY_SKILL[skill ?? 'beginner']}</p>
      </div>

      {/* Card 1: content types & cadence */}
      <div className={CARD}>
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">What do you create?</h2>
          <p className="text-base text-[#464555] mt-1.5 font-normal">
            Pick all that apply, up to {MAX_CONTENT_TYPES}.
            {contentTypes.length > 0 && <span className="text-[#777587]"> {contentTypes.length} selected</span>}
          </p>
        </div>

        <div className="flex flex-col gap-5">
          {CONTENT_TYPE_CATEGORIES.map((c) => (
            <div key={c.label}>
              <p className={CATEGORY_LABEL}>{c.label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label={c.label}>
                {c.types.map((t) => renderTypeTile(t.id, t.label, t.icon, t.iconSelected))}
              </div>
            </div>
          ))}

          <div>
            <p className={CATEGORY_LABEL}>Something else?</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="group" aria-label="Your own content types">
              {customTypes.map((t) => renderTypeTile(t, t, CUSTOM_CONTENT_TYPE_ICON, CUSTOM_CONTENT_TYPE_ICON_SELECTED))}
              {addingType ? (
                <div className={`${TILE_BASE} bg-white ring-2 ring-[#4f46e5]`}>
                  <input
                    autoFocus
                    value={newType}
                    maxLength={40}
                    aria-label="Your content type"
                    onChange={(e) => setNewType(e.target.value)}
                    onBlur={addCustomType}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        addCustomType();
                      } else if (e.key === 'Escape') {
                        setAddingType(false);
                        setNewType('');
                      }
                    }}
                    placeholder="e.g. Recipes"
                    className="w-full bg-transparent border-0 p-0 text-center text-[13px] font-semibold text-[#0b1c30] placeholder:text-[#777587] placeholder:font-normal focus:ring-0 focus:outline-none"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  disabled={typesFull}
                  onClick={() => setAddingType(true)}
                  className={`${TILE_BASE} border border-dashed border-[#c7c4d8] text-[#777587] hover:text-[#3525cd] hover:border-[#4f46e5] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-[#777587] disabled:hover:border-[#c7c4d8]`}
                >
                  <Icon icon="material-symbols:add" width={24} height={24} className="mb-1.5" />
                  <span className="text-[13px] leading-[18px] font-semibold text-inherit">Other</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 p-4 bg-[#eff4ff] rounded-xl">
          <div className="flex flex-col">
            <span className="text-[20px] leading-[28px] tracking-[-0.02em] text-[#0b1c30] font-semibold">How often?</span>
            <span className="text-[14px] leading-[22px] text-[#464555]">Weekly scheduled publishing frequency</span>
          </div>
          <div className="flex items-center gap-4 bg-white px-3 py-1.5 rounded-full shadow-sm">
            <button
              type="button"
              aria-label="Post less often"
              disabled={cadence <= MIN_CADENCE}
              onClick={() => onCadenceChange(Math.max(MIN_CADENCE, cadence - 1))}
              className="size-8 rounded-full bg-[#eff4ff] shadow-sm flex items-center justify-center text-[#0b1c30] hover:bg-[#e5eeff] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon icon="material-symbols:remove" width={16} height={16} />
            </button>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] leading-[36px] tracking-[-0.025em] text-[#3525cd] font-bold">{cadence}</span>
              <span className="text-[13px] leading-[18px] tracking-[0.01em] font-semibold text-[#464555]">per week</span>
            </div>
            <button
              type="button"
              aria-label="Post more often"
              disabled={cadence >= MAX_CADENCE}
              onClick={() => onCadenceChange(Math.min(MAX_CADENCE, cadence + 1))}
              className="size-8 rounded-full bg-[#eff4ff] shadow-sm flex items-center justify-center text-[#0b1c30] hover:bg-[#e5eeff] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Icon icon="material-symbols:add" width={16} height={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Card 2: keywords & goal */}
      <div className={CARD}>
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0b1c30] tracking-tight">Pick your keywords</h2>
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
            <p className="text-base text-[#464555] font-normal">Star your main one, then pick up to 3 more.</p>
            {loadingKeywords ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#3525cd]" role="status">
                <Icon icon="material-symbols:auto-awesome" width={14} height={14} className="animate-pulse" />
                <span className="text-inherit">Finding what people search for…</span>
              </span>
            ) : aiKeywords ? (
              <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#464555]">
                <Icon icon="material-symbols:auto-awesome" width={14} height={14} className="text-[#3525cd]" />
                <span className="text-inherit">Suggested by AI</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5" role="group" aria-label="Keywords">
          {keywords.map((k) => {
            const isPrimary = primaryKeyword === k;
            const isSecondary = secondaryKeywords.includes(k);
            const locked = !isPrimary && !isSecondary && secondaryFull && primaryKeyword !== null;
            const chipClass = isPrimary
              ? 'bg-[#4f46e5] text-white hover:opacity-95'
              : isSecondary
                ? 'bg-[#e5eeff] text-[#3525cd] hover:bg-[#dce9ff]'
                : 'bg-[#eff4ff] text-[#464555] hover:bg-[#e5eeff]';
            return (
              <div key={k} className={`h-10 pl-1.5 pr-4 rounded-full shadow-sm flex items-center gap-1 transition ${chipClass} ${locked ? 'opacity-50' : ''}`}>
                <button
                  type="button"
                  aria-label={isPrimary ? `Unstar ${k}` : `Star ${k} as main keyword`}
                  aria-pressed={isPrimary}
                  onClick={() => starKeyword(k)}
                  className="size-7 rounded-full flex items-center justify-center hover:bg-black/5"
                >
                  <Icon
                    icon={isPrimary || isSecondary ? 'material-symbols:star' : 'material-symbols:star-outline'}
                    width={14}
                    height={14}
                    className={isPrimary ? 'text-white' : isSecondary ? 'text-[#3525cd]' : 'text-[#777587]'}
                  />
                </button>
                <button
                  type="button"
                  aria-pressed={isSecondary}
                  disabled={locked}
                  onClick={() => (primaryKeyword === null ? starKeyword(k) : toggleSecondary(k))}
                  className={`text-[13px] leading-[18px] tracking-[0.01em] font-semibold disabled:cursor-not-allowed ${isPrimary ? 'text-white' : 'text-[#0b1c30]'}`}
                >
                  {k}
                </button>
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex flex-col space-y-3">
          <span className="text-[20px] leading-[28px] tracking-[-0.02em] text-[#0b1c30] font-semibold">Your main goal</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" role="radiogroup" aria-label="Main goal">
            {GOALS.map((g) => {
              const selected = goal === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onGoalChange(g.id)}
                  className={`relative flex flex-col items-center justify-center p-3.5 rounded-xl transition text-center ${
                    selected ? 'bg-[#e5eeff] text-[#3525cd] shadow-sm' : 'bg-white border border-[#c7c4d8]/30 text-[#0b1c30] shadow-sm hover:bg-[#eff4ff]'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 right-2 size-4 rounded-full bg-[#4f46e5] text-white flex items-center justify-center">
                      <Icon icon="material-symbols:check" width={10} height={10} />
                    </span>
                  )}
                  <span className="text-xl mb-1">{g.emoji}</span>
                  <span className={LABEL}>{g.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation, aligned right */}
      <div className="flex items-center justify-end gap-3 pt-2 pb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 rounded-xl bg-[#e5eeff] text-[#0b1c30] text-[13px] leading-[18px] tracking-[0.01em] font-semibold hover:bg-[#dce9ff] transition flex items-center gap-1.5"
        >
          <Icon icon="material-symbols:arrow-back" width={14} height={14} />
          <span className="text-inherit">Back</span>
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="px-7 py-3 rounded-xl bg-[#4f46e5] text-white text-[13px] leading-[18px] tracking-[0.01em] font-semibold shadow-md hover:opacity-95 active:scale-[0.98] transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <span className="text-inherit">Continue</span>
          <Icon icon="material-symbols:arrow-forward" width={16} height={16} />
        </button>
      </div>
    </section>
    </div>
  );
}
