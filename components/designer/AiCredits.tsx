'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { getAiCredits, type AiModels, type CreditBalance, type ModelOption } from '@/lib/api/designApi';
import { publishCredits, refreshCredits } from '@/lib/api/billingClient';
import { useCredits } from '@/components/billing/useCredits';

/** The user's credits (the same balance as the header), whether AI is set up, and the models their plan can pick */
export function useAiCredits() {
  const { credits } = useCredits();
  const [available, setAvailable] = useState(true);
  const [tier, setTier] = useState(0);
  const [models, setModels] = useState<AiModels | null>(null);
  const load = useCallback(() => {
    getAiCredits().then(
      (r) => {
        publishCredits(r.credits);
        setAvailable(r.available);
        setTier(r.tier);
        setModels(r.models);
      },
      () => undefined
    );
  }, []);
  useEffect(load, [load]);
  return { credits, available, tier, models, refresh: refreshCredits };
}

export const resetDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const PLAN_FOR_TIER = ['Free', 'Starter', 'Pro', 'Agency'];

/** "1,240 credits left" with a thin bar of this month's credits */
export function CreditsPill({ credits, className = '' }: { credits: CreditBalance | null; className?: string }) {
  if (!credits) return null;
  const pct = credits.monthly.limit ? (credits.monthly.left / credits.monthly.limit) * 100 : 0;
  return (
    <a
      href="/dashboard/billing"
      className={`inline-flex items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1.5 hover:border-primary/40 ${className}`}
      title={`Resets on ${resetDate(credits.resetsAt)}`}
    >
      <Icon icon="lucide:coins" className="w-4 h-4 text-primary" aria-hidden />
      <span className="text-[13px] font-semibold text-[#0B1C30]">{credits.left.toLocaleString('en-US')} credits left</span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </a>
  );
}

/** Pick an AI image or video model: a small "Model" button that opens a list; models above the user's plan show the plan they need */
export function ModelPicker({
  label,
  options,
  value,
  onChange,
  tier,
  left,
  free,
}: {
  label: string;
  options: ModelOption[];
  value: string;
  onChange: (id: string) => void;
  tier: number;
  left: number | null;
  /** The model the free AI uses cover, and how many are left */
  free?: { id: string; left: number };
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const picked = options.find((m) => m.id === value);
  const listId = useId();
  const isFree = (id: string) => !!free && free.id === id && free.left > 0;
  /** A model with drafts is shown at its draft price */
  const creditsOf = (m: ModelOption) => m.qualities?.[0]?.credits ?? m.credits;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`${label}: ${picked?.name ?? 'none'}`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-xs hover:border-primary/40"
      >
        <Icon icon="lucide:cpu" className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <span className="font-semibold text-[#464555]">Model</span>
        {picked && (
          <span className="truncate text-[#0B1C30]">
            {picked.name}
            <span className="text-[#777587]"> · {isFree(picked.id) ? 'free' : `${picked.qualities ? 'from ' : ''}${creditsOf(picked)} ${creditsOf(picked) === 1 ? 'credit' : 'credits'}`}</span>
          </span>
        )}
        <Icon icon="lucide:chevron-down" className={`w-3.5 h-3.5 text-[#777587] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 z-30 mt-1.5 w-80 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg"
        >
          {options.map((m) => {
            const freeHere = isFree(m.id);
            const locked = m.tier > tier && !freeHere;
            const tooDear = !freeHere && left !== null && creditsOf(m) > left;
            const selected = value === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={locked}
                onClick={() => {
                  onChange(m.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left ${
                  selected ? 'bg-primary-50/70' : locked ? 'opacity-60 cursor-not-allowed' : 'hover:bg-[#F8F9FF]'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#0B1C30]">
                    {m.name}
                    {m.seconds ? <span className="font-normal text-[#777587]"> · {m.seconds}s</span> : null}
                  </span>
                  <span className="block text-xs text-[#777587] truncate">
                    {m.maker} · {m.bestFor}
                  </span>
                </span>
                {freeHere ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Free · {free!.left} left</span>
                ) : locked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                    <Icon icon="lucide:lock" className="w-3 h-3" aria-hidden /> {PLAN_FOR_TIER[Math.max(1, m.tier)]}
                  </span>
                ) : (
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${tooDear ? 'bg-amber-50 text-amber-700' : 'bg-primary-50 text-primary'}`}>
                    {m.qualities ? 'from ' : ''}
                    {creditsOf(m)} {creditsOf(m) === 1 ? 'credit' : 'credits'}
                  </span>
                )}
                {selected && <Icon icon="lucide:check" className="w-4 h-4 text-primary shrink-0" aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
