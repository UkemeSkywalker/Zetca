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
    icon: 'lucide:list',
    iconStyle: 'bg-indigo-50 text-indigo-600',
    title: '7 quick steps',
    badge: 'GUIDED',
    badgeStyle: 'bg-indigo-50 text-indigo-600',
    desc: 'One focused question at a time, completely keyboard-friendly and frictionless.',
  },
  {
    icon: 'lucide:clock',
    iconStyle: 'bg-sky-50 text-sky-600',
    title: 'About 2 minutes',
    badge: 'INSTANT',
    badgeStyle: 'bg-sky-50 text-sky-700',
    desc: 'Zero blank-canvas paralysis, no tedious setup, or manual drafting cycles.',
  },
  {
    icon: 'lucide:network',
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
  { icon: 'lucide:shield-check', label: 'Deterministic Outputs' },
  { icon: 'lucide:zap', label: 'Context-Aware Inference' },
  { icon: 'lucide:refresh-cw', label: 'Live State Preserved' },
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
    <div className="max-w-[848px] mx-auto flex flex-col items-center">
      {/* Status pill */}
      <div className="mb-[27px] flex items-center gap-3 px-4 py-2.5 rounded-full bg-white border border-slate-200/80 shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
        <span className="w-3.5 h-3.5 rounded-full bg-indigo-100 flex items-center justify-center" aria-hidden="true">
          <span className="w-2 h-2 rounded-full bg-indigo-600" />
        </span>
        <span className="text-[13px] font-semibold tracking-[0.04em] text-indigo-700">✦ READY TO BEGIN</span>
        <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
        <span className="text-[13px] text-slate-500">Sprint v2.4</span>
      </div>

      {/* Main card */}
      <div className="relative w-full bg-white rounded-[20px] border border-slate-200/70 shadow-[0_10px_40px_rgba(15,23,42,0.06)] px-6 sm:px-[30px] pt-[30px] pb-[86px] overflow-hidden">
        {/* Soft glow behind the icon */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-[520px] h-[220px] rounded-full bg-indigo-100/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="w-[72px] h-[72px] rounded-[18px] bg-indigo-50 border border-indigo-100 shadow-[0_8px_24px_rgba(99,102,241,0.25)] flex items-center justify-center">
            <Icon icon="lucide:sparkles" width={30} height={30} className="text-indigo-600" />
          </div>

          <h1 className="mt-7 text-[32px] sm:text-[40px] leading-[1.15] font-bold tracking-[-0.03em] text-slate-900">
            Let&apos;s build your content strategy
          </h1>
          <p className="mt-4 max-w-[640px] text-[17px] sm:text-[19px] leading-[1.6] text-slate-500">
            Answer a few quick questions about your brand and audience. We&apos;ll craft a multi-platform distribution
            engine and SEO-ready channel manifests.
          </p>
        </div>

        {/* Feature rows */}
        <div className="relative mt-10 space-y-4">
          {features.map((f, i) => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl bg-slate-50/70 border border-slate-100 px-5 py-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${f.iconStyle}`}>
                <Icon icon={f.icon} width={20} height={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-[17px] font-semibold text-slate-900">{f.title}</h3>
                  <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold tracking-[0.04em] ${f.badgeStyle}`}>{f.badge}</span>
                </div>
                <p className="mt-1 text-[15px] leading-[1.6] text-slate-500">{f.desc}</p>
                {i === features.length - 1 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {platforms.map((p) => (
                      <span key={p.name} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white border border-slate-200 text-[12px] text-slate-700">
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
          className="relative mt-10 w-full h-16 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[19px] font-semibold flex items-center justify-center gap-3 shadow-[0_10px_24px_rgba(79,70,229,0.35)] transition-colors"
        >
          <span className="text-inherit">Start building</span>
          <Icon icon="lucide:arrow-right" width={20} height={20} />
        </button>

        <div className="relative mt-5 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/strategist/saved"
            className="flex items-center gap-2 text-[15px] text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Icon icon="lucide:history" width={16} height={16} className="text-slate-400" />
            <span className="text-inherit">View saved strategies{savedCount !== null ? ` (${savedCount})` : ''}</span>
          </Link>
          <p className="flex items-center gap-2 text-[15px] text-slate-500">
            Press
            <kbd className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 shadow-[0_1px_0_#e2e8f0] font-mono text-[13px] font-semibold text-slate-700">
              Enter ↵
            </kbd>
            to begin
          </p>
        </div>
      </div>

      {/* Trust row */}
      <div className="mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[15px] text-slate-600">
        {trustItems.map((t, i) => (
          <span key={t.label} className="flex items-center gap-2">
            {i > 0 && <span className="w-1 h-1 rounded-full bg-slate-300 mr-4" aria-hidden="true" />}
            <Icon icon={t.icon} width={16} height={16} className="text-indigo-500" />
            <span className="text-inherit">{t.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
