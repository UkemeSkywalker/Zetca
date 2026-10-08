'use client';

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';
import type { Niche } from './NicheStep';
import { findNiche } from '@/lib/strategist/niches';

export type SkillLevel = 'beginner' | 'intermediate' | 'pro';

export const AGE_RANGES = ['13–17', '18–24', '25–34', '35–44', '45+'];

const SKILLS: { id: SkillLevel; emoji: string; label: string; desc: string; aria: string }[] = [
  { id: 'beginner', emoji: '🌱', label: 'Beginner', desc: 'Just getting started', aria: 'Seedling' },
  { id: 'intermediate', emoji: '🌿', label: 'Intermediate', desc: 'Knows the basics', aria: 'Herb' },
  { id: 'pro', emoji: '🌳', label: 'Pro', desc: 'Ready for more', aria: 'Tree' },
];

// Suggestion chips come from each niche's data; custom niches fall back to the general list
const GENERAL_SUGGESTIONS = {
  interests: ['How-to guides', 'Behind the scenes', 'Product reviews', 'Community stories'],
  struggles: ['Where to start?', 'No time', 'Too much information', 'Staying consistent'],
};

const MAX_SUGGESTIONS = 4;

function suggestionsFor(niches: Niche[], kind: 'interests' | 'struggles'): string[] {
  const lists = niches.map((n) => findNiche(n.label)?.[kind] ?? GENERAL_SUGGESTIONS[kind]);
  const pool = lists.length ? lists : [GENERAL_SUGGESTIONS[kind]];
  // Interleave so each niche contributes, then dedupe
  const merged: string[] = [];
  for (let i = 0; merged.length < 12 && i < 4; i++) {
    for (const list of pool) if (list[i] && !merged.includes(list[i])) merged.push(list[i]);
  }
  return merged;
}

interface TagFieldProps {
  id: string;
  dotClass: string;
  title: string;
  hint: string;
  tags: string[];
  suggestions: string[];
  chipClass: string;
  removeHoverClass: string;
  onChange: (tags: string[]) => void;
}

/** A "pick or type" box: tags inside, a text field to add more, and suggestion chips below */
function TagField({ id, dotClass, title, hint, tags, suggestions, chipClass, removeHoverClass, onChange }: TagFieldProps) {
  const [draft, setDraft] = useState('');

  const add = (value: string) => {
    const clean = value.trim();
    if (!clean || tags.some((t) => t.toLowerCase() === clean.toLowerCase())) return;
    onChange([...tags, clean]);
  };
  const remove = (value: string) => onChange(tags.filter((t) => t !== value));
  const remaining = suggestions.filter((s) => !tags.includes(s)).slice(0, MAX_SUGGESTIONS);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[20px] leading-[28px] tracking-[-0.02em] font-semibold text-[#0b1c30] flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dotClass}`} />
          {title}
        </h3>
        <span className="text-[11px] leading-[14px] tracking-[0.05em] font-bold text-[#464555]">{hint}</span>
      </div>

      <div className="w-full min-h-[58px] p-2.5 rounded-xl bg-white shadow-sm flex flex-wrap items-center gap-2 transition-all border border-slate-200/70 focus-within:border-[#3525cd]/50">
        {tags.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] leading-[18px] tracking-[0.01em] font-semibold ${chipClass}`}>
            <span className="text-inherit">{t}</span>
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => remove(t)}
              className={`inline-flex items-center justify-center p-0.5 rounded focus:outline-none text-inherit ${removeHoverClass}`}
            >
              <Icon icon="material-symbols:close" width={14} height={14} />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          maxLength={40}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              add(draft);
              setDraft('');
            } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
              remove(tags[tags.length - 1]);
            }
          }}
          placeholder="Type to add..."
          className="flex-1 min-w-[120px] bg-transparent border-0 text-[#0b1c30] placeholder:text-[#777587] text-[14px] leading-[22px] px-2 py-1 outline-none focus:ring-0"
        />
      </div>

      {remaining.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] leading-[14px] tracking-[0.05em] font-bold text-[#464555]">Suggestions:</span>
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] leading-[18px] tracking-[0.01em] font-semibold transition-colors"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AudienceStepProps {
  niches: Niche[];
  ages: string[];
  skill: SkillLevel | null;
  interests: string[];
  struggles: string[];
  onAgesChange: (ages: string[]) => void;
  onSkillChange: (skill: SkillLevel) => void;
  onInterestsChange: (interests: string[]) => void;
  onStrugglesChange: (struggles: string[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export function AudienceStep({
  niches,
  ages,
  skill,
  interests,
  struggles,
  onAgesChange,
  onSkillChange,
  onInterestsChange,
  onStrugglesChange,
  onBack,
  onContinue,
}: AudienceStepProps) {
  const canContinue = ages.length > 0 && skill !== null;

  // Enter continues, unless the user is typing in a tag field or a button has focus
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

  const toggleAge = (age: string) =>
    onAgesChange(ages.includes(age) ? ages.filter((a) => a !== age) : AGE_RANGES.filter((a) => a === age || ages.includes(a)));

  return (
    <div className="w-full flex flex-col gap-6 mx-auto">
      {/* Step A: Who's watching? */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 border border-slate-200/40 relative">
        <div>
          <span className="text-[11px] leading-[14px] tracking-wider uppercase font-bold text-[#3525cd]">Audience Demographics</span>
          <h2 className="text-[28px] leading-[36px] tracking-[-0.025em] font-bold text-[#0b1c30] mt-1">Who&apos;s watching?</h2>
          <p className="text-[14px] leading-[22px] text-[#464555] mt-0.5">Pick all the ages that fit.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5" role="group" aria-label="Age ranges">
          {AGE_RANGES.map((age) => {
            const selected = ages.includes(age);
            return (
              <button
                key={age}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleAge(age)}
                className={`px-4 py-2 rounded-xl text-[13px] leading-[18px] tracking-[0.01em] font-semibold flex items-center gap-1.5 transition-all ${
                  selected ? 'bg-[#3525cd] text-white shadow-sm' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#e5eeff]'
                }`}
              >
                {selected && <Icon icon="material-symbols:check" width={16} height={16} />}
                <span className="text-inherit">{age}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[20px] leading-[28px] tracking-[-0.02em] font-semibold text-[#0b1c30]">Their skill level</h3>
            <span className="text-[11px] leading-[14px] tracking-[0.05em] font-bold text-[#464555]">Select primary baseline</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5" role="radiogroup" aria-label="Skill level">
            {SKILLS.map((s) => {
              const active = skill === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSkillChange(s.id)}
                  className={`text-left cursor-pointer p-4 rounded-xl transition-all flex flex-col justify-between gap-3 ${
                    active ? 'bg-[#e2dfff]/40 shadow-sm' : 'bg-[#eff4ff] hover:bg-[#e5eeff]'
                  }`}
                >
                  <div className="flex items-start justify-between w-full">
                    <span aria-label={s.aria} className="text-2xl" role="img">
                      {s.emoji}
                    </span>
                    {active && <Icon icon="material-symbols:check-circle" width={20} height={20} className="text-[#3525cd]" />}
                  </div>
                  <div>
                    <p className="text-[13px] leading-[18px] tracking-[0.01em] font-bold text-[#0b1c30]">{s.label}</p>
                    <p className="text-[14px] leading-[22px] text-[#464555] mt-0.5">{s.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Connecting thread between the two sections */}
      <div className="flex items-center justify-center py-0.5 -my-1.5" aria-hidden="true">
        <div className="flex items-center gap-2 text-slate-300">
          <div className="w-12 h-px bg-slate-200" />
          <div className="w-2.5 h-2.5 rounded-full border-2 border-indigo-400 bg-white" />
          <div className="w-12 h-px bg-slate-200" />
        </div>
      </div>

      {/* Step B: What do they care about? */}
      <section className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 border border-slate-200/40">
        <div>
          <span className="text-[11px] leading-[14px] tracking-wider uppercase font-bold text-[#8127cf]">Psychographics &amp; Friction</span>
          <h2 className="text-[28px] leading-[36px] tracking-[-0.025em] font-bold text-[#0b1c30] mt-1">What do they care about?</h2>
          <p className="text-[14px] leading-[22px] text-[#464555] mt-0.5">Define recurring interests and common hurdles your content tackles.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TagField
            id="input-interests"
            dotClass="bg-[#3525cd]"
            title="Interests"
            hint="Core topics"
            tags={interests}
            suggestions={suggestionsFor(niches, 'interests')}
            chipClass="bg-[#e2dfff] text-[#3323cc]"
            removeHoverClass="hover:text-[#0f0069]"
            onChange={onInterestsChange}
          />
          <TagField
            id="input-struggles"
            dotClass="bg-[#ba1a1a]"
            title="Struggles"
            hint="Key obstacles"
            tags={struggles}
            suggestions={suggestionsFor(niches, 'struggles')}
            chipClass="bg-[#ffdad6] text-[#93000a]"
            removeHoverClass="hover:text-[#ba1a1a]"
            onChange={onStrugglesChange}
          />
        </div>
      </section>

      {/* Navigation dock */}
      <div className="w-full flex items-center justify-between py-4">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-3 rounded-xl bg-white hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] leading-[18px] tracking-[0.01em] font-semibold shadow-sm transition-all flex items-center gap-2"
        >
          <Icon icon="material-symbols:arrow-back" width={18} height={18} />
          <span className="text-inherit">Back</span>
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="px-7 py-3 rounded-xl bg-[#3525cd] text-white text-[13px] leading-[18px] tracking-[0.01em] font-bold shadow-md hover:bg-[#3323cc] active:scale-95 transition-all flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <span className="text-inherit">Continue</span>
          <Icon icon="material-symbols:arrow-forward" width={18} height={18} />
          <span className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-[#4f46e5] text-[12px] leading-[16px] tracking-[0.02em] font-semibold text-white opacity-80">
            ↵ Enter
          </span>
        </button>
      </div>
    </div>
  );
}
