'use client';

import { Icon } from '@iconify/react';
import { useEffect, useRef } from 'react';

export type PlatformId = 'youtube' | 'instagram' | 'tiktok' | 'linkedin' | 'x' | 'facebook';

interface Platform {
  id: PlatformId;
  key: string;
  name: string;
  desc: string;
  iconBg: string;
  icon?: string;
  glyph?: string;
}

export const PLATFORMS: Platform[] = [
  { id: 'youtube', key: 'A', name: 'YouTube', desc: 'Long-form & Shorts', iconBg: 'bg-red-600', icon: 'material-symbols:smart-display' },
  { id: 'instagram', key: 'B', name: 'Instagram', desc: 'Reels & carousels', iconBg: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600', icon: 'material-symbols:photo-camera-outline' },
  { id: 'tiktok', key: 'C', name: 'TikTok', desc: 'Viral short video', iconBg: 'bg-slate-900', icon: 'material-symbols:music-note' },
  { id: 'linkedin', key: 'D', name: 'LinkedIn', desc: 'B2B & thought leaders', iconBg: 'bg-[#0A66C2]', icon: 'material-symbols:work-outline' },
  { id: 'x', key: 'E', name: 'X (Twitter)', desc: 'Real-time threads', iconBg: 'bg-black', glyph: '𝕏' },
  { id: 'facebook', key: 'F', name: 'Facebook', desc: 'Niche communities', iconBg: 'bg-[#1877F2]', icon: 'material-symbols:groups-outline' },
];

export const BRAND_NAME_MAX = 40;

interface BrandStepProps {
  brandName: string;
  platforms: PlatformId[];
  onBrandNameChange: (value: string) => void;
  onTogglePlatform: (id: PlatformId) => void;
  onContinue: () => void;
}

export function BrandStep({ brandName, platforms, onBrandNameChange, onTogglePlatform, onContinue }: BrandStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nameValid = brandName.trim().length > 0;
  const canContinue = nameValid && platforms.length > 0;

  // A–F toggle platforms (outside the text input); Enter continues
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = document.activeElement === inputRef.current;
      if (e.key === 'Enter') {
        // A focused button handles its own Enter (toggles a platform card)
        if (document.activeElement?.tagName !== 'BUTTON' && canContinue) onContinue();
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      const platform = PLATFORMS.find((p) => p.key === e.key.toUpperCase());
      if (platform) onTogglePlatform(platform.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canContinue, onContinue, onTogglePlatform]);

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6">
      {/* Top step context */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs">1</span>
          <span className="text-xs font-bold tracking-wider uppercase text-slate-500">Core Identity Phase</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-medium text-slate-600">Estimated completion: ~3 mins</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-white/70 px-3 py-1 rounded-full shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Primary form card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 shadow-[0_4px_25px_-4px_rgba(15,23,42,0.06),0_1px_3px_0_rgba(15,23,42,0.04)] relative overflow-hidden transition-all duration-300">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-600">Step 1 · Brand Foundation</span>
        </div>

        {/* Question 1: brand name */}
        <div className="mb-8">
          <label className="block text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-1.5" htmlFor="brand-input">
            What&apos;s your brand or channel called?
          </label>
          <p className="text-xs sm:text-sm text-slate-500 mb-4 leading-relaxed">
            This will anchor your voice, profile handles, and cross-platform mentions across all generated strategy templates.
          </p>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Icon icon="material-symbols:badge-outline" width={20} height={20} />
            </div>
            <input
              ref={inputRef}
              id="brand-input"
              type="text"
              autoFocus
              maxLength={BRAND_NAME_MAX}
              value={brandName}
              onChange={(e) => onBrandNameChange(e.target.value)}
              placeholder="e.g. Fit with Ade"
              className="w-full pl-11 pr-24 py-3.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white rounded-xl border border-gray-500 text-slate-900 font-semibold text-base sm:text-lg placeholder:text-slate-400 placeholder:font-normal shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-slate-400 hidden sm:inline-block">
                {brandName.length}/{BRAND_NAME_MAX}
              </span>
              {nameValid && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  <Icon icon="material-symbols:check" width={13} height={13} className="mr-0.5" />
                  <span className="text-inherit">Valid</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Question 2: platforms */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-1.5 gap-1">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">Where do you want to grow?</h2>
            <span className="text-xs font-semibold text-indigo-600">
              {platforms.length} {platforms.length === 1 ? 'platform' : 'platforms'} active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mb-4">
            Pick all that apply · Multi-platform strategies cross-pollinate audience reach seamlessly.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3" role="group" aria-label="Platforms">
            {PLATFORMS.map((p) => {
              const selected = platforms.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onTogglePlatform(p.id)}
                  className={`text-left cursor-pointer relative p-3.5 rounded-xl transition-all duration-150 select-none shadow-sm hover:shadow-md ${
                    selected ? 'bg-indigo-50 ring-2 ring-indigo-600' : 'bg-slate-50/80 hover:bg-slate-100/70 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg text-white flex items-center justify-center shadow-sm ${p.iconBg}`}>
                      {p.icon ? <Icon icon={p.icon} width={19} height={19} /> : <span className="font-black text-sm text-white">{p.glyph}</span>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          selected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-transparent'
                        }`}
                      >
                        <Icon icon="material-symbols:check" width={14} height={14} />
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/80 px-1.5 py-0.5 rounded">{p.key}</span>
                    </div>
                  </div>
                  <div className="font-bold text-sm text-slate-900 tracking-tight">{p.name}</div>
                  <div className="text-[11px] text-slate-500 truncate">{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom nav bar */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            disabled
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-slate-100/80 cursor-not-allowed opacity-75"
          >
            <Icon icon="material-symbols:arrow-back" width={17} height={17} />
            <span className="text-inherit">Back</span>
          </button>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <span className="text-inherit">Press</span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 bg-slate-100 rounded shadow-[0_1px_2px_0_rgba(15,23,42,0.08),inset_0_-1px_0_0_rgba(15,23,42,0.15)]">
                ↵ Enter
              </kbd>
              <span className="text-inherit">to continue</span>
            </span>
            <button
              type="button"
              onClick={onContinue}
              disabled={!canContinue}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-[0_4px_14px_0_rgba(79,70,229,0.35)] hover:shadow-[0_6px_20px_0_rgba(79,70,229,0.45)] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span className="text-inherit">Continue</span>
              <Icon icon="material-symbols:arrow-forward" width={18} height={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tip banner */}
      <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/60 text-xs text-slate-600">
        <div className="flex items-center gap-2.5">
          <Icon icon="material-symbols:lightbulb-outline" width={18} height={18} className="text-indigo-600" />
          <span className="text-slate-600">
            Focusing on 2 channels yields <strong>3.2x higher consistency</strong> in the first 90 days.
          </span>
        </div>
        <a className="text-indigo-600 font-semibold hover:underline hidden sm:inline" href="#pro-tips">
          Learn why
        </a>
      </div>
    </div>
  );
}
