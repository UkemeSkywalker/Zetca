'use client';

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import type { PlatformId } from './BrandStep';

export interface Niche {
  label: string;
  emoji: string;
}

export const NICHES: (Niche & { topics: string[] })[] = [
  { label: 'Fitness', emoji: '💪', topics: ['Home workouts', 'Weight loss', 'Strength', 'Yoga', 'Running', 'Nutrition'] },
  { label: 'Tech', emoji: '💻', topics: ['Gadget reviews', 'Coding', 'AI tools', 'Smartphones', 'PC builds', 'Tech news'] },
  { label: 'Finance', emoji: '💰', topics: ['Investing', 'Budgeting', 'Crypto', 'Side hustles', 'Real estate', 'Saving money'] },
  { label: 'Cooking', emoji: '🍳', topics: ['Quick meals', 'Baking', 'Healthy recipes', 'Meal prep', 'Vegan', 'Street food'] },
  { label: 'Gaming', emoji: '🎮', topics: ["Let's plays", 'Esports', 'Game reviews', 'Speedruns', 'Mobile gaming', 'Streaming'] },
  { label: 'Education', emoji: '📚', topics: ['Study tips', 'Languages', 'Science', 'Math', 'History', 'Exam prep'] },
  { label: 'Travel', emoji: '✈️', topics: ['Budget travel', 'Solo travel', 'Van life', 'Luxury travel', 'Travel tips', 'Food tours'] },
  { label: 'Beauty', emoji: '💄', topics: ['Makeup', 'Skincare', 'Haircare', 'Nails', 'Product reviews', 'Tutorials'] },
];

const CUSTOM_EMOJI = '✨';

const PLATFORM_BADGES: Record<PlatformId, { icon: string; style: string; label: string }> = {
  youtube: { icon: 'simple-icons:youtube', style: 'bg-red-50 text-red-600', label: 'YouTube' },
  instagram: { icon: 'simple-icons:instagram', style: 'bg-pink-50 text-pink-600', label: 'Instagram' },
  tiktok: { icon: 'simple-icons:tiktok', style: 'bg-slate-100 text-slate-900', label: 'TikTok' },
  linkedin: { icon: 'simple-icons:linkedin', style: 'bg-blue-50 text-[#0A66C2]', label: 'LinkedIn' },
  x: { icon: 'simple-icons:x', style: 'bg-slate-100 text-black', label: 'X' },
  facebook: { icon: 'simple-icons:facebook', style: 'bg-blue-50 text-[#1877F2]', label: 'Facebook' },
};

const COUNT_WORDS = ['', 'one platform', 'two platforms', 'three platforms', 'four platforms', 'five platforms', 'six platforms'];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  // First and last word, e.g. "Fit with Ade" -> "FA"
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (parts[0][0] + last).toUpperCase();
}

const CHIP_BASE = 'h-[44px] rounded-full px-4 py-2 flex items-center gap-2 font-semibold text-[15px] transition-all';
const CHIP_ON = 'bg-indigo-50 text-indigo-700 shadow-sm';
const CHIP_OFF = 'bg-[#EEF2F7] hover:bg-slate-200 text-slate-900';
const TOPIC_BASE = 'h-[36px] rounded-full px-3.5 py-1.5 flex items-center gap-1.5 font-medium text-[14px] transition-all';

interface InlineAddProps {
  size: 'niche' | 'topic';
  onAdd: (value: string) => void;
}

/** "+ Other" chip that turns into a text field for a custom value */
function InlineAdd({ size, onAdd }: InlineAddProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const isNiche = size === 'niche';

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={`${isNiche ? 'h-[44px] px-4 py-2 gap-1.5 font-semibold text-[15px]' : 'h-[36px] px-3.5 py-1.5 gap-1 font-medium text-[14px]'} rounded-full flex items-center bg-slate-100 text-slate-500 hover:text-slate-900 transition-all`}
      >
        <Icon icon="material-symbols:add" width={isNiche ? 17 : 15} height={isNiche ? 17 : 15} />
        <span className="text-inherit">Other</span>
      </button>
    );
  }

  const commit = () => {
    const trimmed = value.trim();
    if (trimmed) onAdd(trimmed);
    setEditing(false);
    setValue('');
  };

  return (
    <input
      autoFocus
      value={value}
      maxLength={40}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          commit();
        } else if (e.key === 'Escape') {
          setEditing(false);
          setValue('');
        }
      }}
      placeholder={isNiche ? 'Your niche…' : 'Your topic…'}
      className={`${isNiche ? 'h-[44px] text-[15px] font-semibold w-[180px]' : 'h-[36px] text-[14px] font-medium w-[160px]'} rounded-full px-4 border-0 bg-white text-slate-900 placeholder:text-slate-400 placeholder:font-normal ring-2 ring-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
    />
  );
}

interface NicheStepProps {
  brandName: string;
  platforms: PlatformId[];
  niche: Niche | null;
  topic: string | null;
  onNicheChange: (niche: Niche) => void;
  onTopicChange: (topic: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function NicheStep({ brandName, platforms, niche, topic, onNicheChange, onTopicChange, onBack, onContinue }: NicheStepProps) {
  const canContinue = niche !== null;

  // Custom values the user added with "+ Other"
  const [customNiches, setCustomNiches] = useState<Niche[]>(() =>
    niche && !NICHES.some((n) => n.label === niche.label) ? [niche] : []
  );
  const [customTopics, setCustomTopics] = useState<string[]>([]);

  const presetNiche = niche ? NICHES.find((n) => n.label === niche.label) : undefined;
  const topics = [...(presetNiche?.topics ?? []), ...customTopics];
  // Keep a custom topic chosen earlier visible after coming back to this step
  if (topic && !topics.includes(topic)) topics.push(topic);

  // Enter continues, unless the user is typing or a chip has focus
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

  const selectNiche = (n: Niche) => {
    onNicheChange(n);
    setCustomTopics([]);
  };

  const countWord = COUNT_WORDS[platforms.length] ?? `${platforms.length} platforms`;
  const bubbleText = `Nice, ${countWord} is a great start!`;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      {/* "Your strategy" summary strip */}
      <div className="w-full bg-white rounded-[14px] shadow-[0_4px_25px_-4px_rgba(15,23,42,0.06),0_1px_3px_0_rgba(15,23,42,0.04)] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-100/60">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-sm">
            {getInitials(brandName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-semibold text-slate-900 tracking-tight leading-tight">{brandName}</span>
            <span className="text-[12px] text-slate-400 font-medium">Channel profile</span>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            {platforms.map((id) => {
              const badge = PLATFORM_BADGES[id];
              return (
                <div key={id} className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${badge.style}`} title={badge.label}>
                  <Icon icon={badge.icon} width={16} height={16} />
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {niche ? (
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3.5 py-1.5 rounded-full shadow-sm">
              <span className="text-sm">{niche.emoji}</span>
              <span className="text-[14px] font-semibold text-indigo-700">
                {niche.label}
                {topic ? ` › ${topic}` : ''}
              </span>
            </div>
          ) : (
            <div className="h-7 w-40 rounded-full bg-slate-100" aria-hidden="true" />
          )}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="h-2 w-8 bg-slate-100 rounded-full" />
            <div className="h-2 w-5 bg-slate-100 rounded-full" />
          </div>
        </div>
      </div>

      {/* AI bubble */}
      <div className="inline-flex items-center gap-2.5 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-full self-start shadow-sm">
        <Icon icon="material-symbols:auto-awesome" width={18} height={18} className="text-indigo-700" />
        <span className="text-[14px] font-medium text-indigo-700">{bubbleText}</span>
      </div>

      {/* Main question card */}
      <div className="bg-white rounded-[14px] shadow-[0_4px_25px_-4px_rgba(15,23,42,0.06),0_1px_3px_0_rgba(15,23,42,0.04)] p-6 sm:p-10 border border-slate-100/60 flex flex-col">
        <h1 className="text-[32px] leading-[40px] font-bold text-slate-900 tracking-tight">What&apos;s your channel about?</h1>
        <p className="text-[15px] leading-relaxed text-slate-500 mt-2">Pick a niche, or add your own.</p>

        <div className="flex flex-wrap gap-3 mt-7" role="group" aria-label="Niche">
          {[...NICHES, ...customNiches].map((n) => {
            const selected = niche?.label === n.label;
            return (
              <button
                key={n.label}
                type="button"
                aria-pressed={selected}
                onClick={() => selectNiche({ label: n.label, emoji: n.emoji })}
                className={`${CHIP_BASE} ${selected ? CHIP_ON : CHIP_OFF}`}
              >
                <span className="text-base">{n.emoji}</span>
                <span className="text-inherit">{n.label}</span>
                {selected && <Icon icon="material-symbols:check" width={17} height={17} className="text-indigo-700" />}
              </button>
            );
          })}
          <InlineAdd
            size="niche"
            onAdd={(label) => {
              const custom = { label, emoji: CUSTOM_EMOJI };
              setCustomNiches((current) => (current.some((c) => c.label === label) ? current : [...current, custom]));
              selectNiche(custom);
            }}
          />
        </div>

        {niche && (
          <div className="mt-8">
            <h2 className="text-[18px] leading-snug font-semibold text-slate-900">Narrow it down</h2>
            <div className="flex flex-wrap gap-2.5 mt-4" role="group" aria-label="Core topic">
              {topics.map((t) => {
                const selected = topic === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onTopicChange(t)}
                    className={`${TOPIC_BASE} ${selected ? CHIP_ON : CHIP_OFF}`}
                  >
                    <span className="text-inherit">{t}</span>
                    {selected && <Icon icon="material-symbols:check" width={15} height={15} className="text-indigo-700" />}
                  </button>
                );
              })}
              <InlineAdd
                size="topic"
                onAdd={(t) => {
                  setCustomTopics((current) => (current.includes(t) ? current : [...current, t]));
                  onTopicChange(t);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation row */}
      <div className="flex justify-between items-center w-full px-1">
        <button
          type="button"
          onClick={onBack}
          className="bg-white hover:bg-slate-50 text-slate-600 rounded-[10px] px-5 py-2.5 text-sm font-medium shadow-[0_4px_25px_-4px_rgba(15,23,42,0.06),0_1px_3px_0_rgba(15,23,42,0.04)] transition-all active:scale-[0.98] border border-slate-200/60"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="bg-[#4f46e5] hover:bg-indigo-700 text-white rounded-[10px] px-6 py-2.5 text-sm font-semibold shadow-[0_4px_14px_0_rgba(79,70,229,0.35)] hover:shadow-[0_6px_20px_0_rgba(79,70,229,0.45)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
