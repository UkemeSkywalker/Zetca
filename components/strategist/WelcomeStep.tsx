'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useEffect } from 'react';

interface WelcomeStepProps {
  savedCount: number | null;
  onStart: () => void;
}

const features = [
  {
    icon: 'material-symbols:format-list-bulleted',
    iconStyle: 'bg-indigo-50 text-indigo-600',
    title: '7 quick steps',
    badge: 'GUIDED',
    badgeStyle: 'bg-indigo-50 text-indigo-600',
    desc: 'One focused question at a time, completely keyboard-friendly and frictionless.',
  },
  {
    icon: 'material-symbols:schedule-outline',
    iconStyle: 'bg-sky-50 text-sky-600',
    title: 'About 2 minutes',
    badge: 'INSTANT',
    badgeStyle: 'bg-sky-50 text-sky-700',
    desc: 'Zero blank-canvas paralysis, no tedious setup, or manual drafting cycles.',
  },
  {
    icon: 'material-symbols:hub-outline',
    iconStyle: 'bg-purple-50 text-purple-600',
    title: 'YouTube, Instagram, TikTok & LinkedIn',
    badge: 'MULTI-PLATFORM',
    badgeStyle: 'bg-purple-50 text-purple-700',
    desc: 'Production-ready bios and distribution schedules formulated for search indexing & high conversion.',
  },
];

const platforms = [
  { name: 'YouTube', dot: 'bg-red-500' },
  { name: 'Instagram', dot: 'bg-pink-500' },
  { name: 'TikTok', dot: 'bg-slate-900' },
  { name: 'LinkedIn', dot: 'bg-blue-600' },
];

const trustItems = [
  { icon: 'material-symbols:verified-user-outline', label: 'Deterministic Outputs' },
  { icon: 'material-symbols:bolt', label: 'Context-Aware Inference' },
  { icon: 'material-symbols:sync', label: 'Live State Preserved' },
];

export function WelcomeStep({ savedCount, onStart }: WelcomeStepProps) {
  // Enter starts the quiz, as the footer hint promises
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.key === 'Enter' && !(target && ['INPUT', 'TEXTAREA', 'BUTTON', 'A'].includes(target.tagName))) {
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="w-full max-w-[678px] mx-auto flex flex-col items-center">
      {/* Status pill */}
      <div className="mb-[22px] flex items-center gap-2.5 px-3 py-2 rounded-full bg-white border border-slate-200/80 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <span className="w-3 h-3 rounded-full bg-indigo-100 flex items-center justify-center" aria-hidden="true">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
        </span>
        <span className="text-[11px] font-semibold tracking-[0.04em] text-indigo-700">✦ READY TO BEGIN</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        <span className="text-[11px] text-slate-500">Sprint v2.4</span>
      </div>

      {/* Main card */}
      <div className="relative w-full bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_25px_-4px_rgba(15,23,42,0.06),0_1px_3px_0_rgba(15,23,42,0.04)] px-6 pt-6 pb-[69px] overflow-hidden">
        {/* Soft glow behind the icon */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[416px] h-[176px] rounded-full bg-indigo-100/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="w-[58px] h-[58px] rounded-[14px] bg-indigo-50 border border-indigo-100 shadow-[0_6px_20px_rgba(99,102,241,0.25)] flex items-center justify-center">
            <Icon icon="material-symbols:auto-awesome" width={24} height={24} className="text-indigo-600" />
          </div>

          <h1 className="mt-[22px] text-[26px] sm:text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-slate-900">
            Let&apos;s build your content strategy
          </h1>
          <p className="mt-3 max-w-[512px] text-[14px] sm:text-[15px] leading-[1.6] text-slate-500">
            Answer a few quick questions about your brand and audience. We&apos;ll craft a multi-platform distribution
            engine and SEO-ready channel manifests.
          </p>
        </div>

        {/* Feature rows */}
        <div className="relative mt-8 space-y-3">
          {features.map((f, i) => (
            <div key={f.title} className="flex items-start gap-3 rounded-xl bg-slate-50/70 border border-slate-100 px-4 py-4">
              <div className={`w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 ${f.iconStyle}`}>
                <Icon icon={f.icon} width={16} height={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14px] font-semibold text-slate-900">{f.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-[0.04em] ${f.badgeStyle}`}>{f.badge}</span>
                </div>
                <p className="mt-0.5 text-[12px] leading-[1.6] text-slate-500">{f.desc}</p>
                {i === features.length - 1 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5"> 
                    {platforms.map((p) => (
                      <span key={p.name} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] text-slate-700">
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} aria-hidden="true" />
                        <span className="text-inherit">{p.name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Start */}
        <button
          type="button"
          onClick={onStart}
          className="relative mt-8 w-full h-[51px] rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[15px] font-semibold flex items-center justify-center gap-2.5 shadow-[0_4px_14px_0_rgba(79,70,229,0.35)] hover:shadow-[0_6px_20px_0_rgba(79,70,229,0.45)] transition-all"
        >
          <span className="text-inherit">Start building</span>
          <Icon icon="material-symbols:arrow-forward" width={16} height={16} />
        </button>

        <div className="relative mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/strategist"
            className="flex items-center gap-1.5 text-[12px] text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Icon icon="material-symbols:history" width={13} height={13} className="text-slate-400" />
            <span className="text-inherit">View saved strategies{savedCount !== null ? ` (${savedCount})` : ''}</span>
          </Link>
          <p className="flex items-center gap-1.5 text-[12px] text-slate-500">
            Press
            <kbd className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 shadow-[0_1px_2px_0_rgba(15,23,42,0.08),inset_0_-1px_0_0_rgba(15,23,42,0.15)] font-mono text-[10px] font-bold text-slate-700">
              Enter ↵
            </kbd>
            to begin
          </p>
        </div>
      </div>

      {/* Trust row */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-slate-600">
        {trustItems.map((t, i) => (
          <span key={t.label} className="flex items-center gap-2">
            {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-300 mr-3" aria-hidden="true" />}
            <Icon icon={t.icon} width={13} height={13} className="text-indigo-500" />
            <span className="text-inherit">{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
