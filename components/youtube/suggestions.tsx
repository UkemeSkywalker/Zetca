'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Check } from '@/lib/api/youtubeApi';
import { normalize } from '@/lib/youtube/research';

/** A 0–100 score, coloured green (70+), amber (40–69) or grey */
export function ScoreBadge({ score, className = '' }: { score: number; className?: string }) {
  const tone = score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-slate-400';
  return <span className={`font-bold tabular-nums ${tone} ${className}`}>{score}</span>;
}

/** The live score for a field, with the checks behind it on tap or click */
export function FieldScore({ score, checks, label }: { score: number; checks: Check[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label} score ${score} out of 100. Show why`}
        className="flex items-center gap-1 rounded-full bg-white border border-[#c7c4d8]/50 px-2 py-0.5 text-xs hover:border-primary/40"
      >
        <Icon icon="solar:chart-2-linear" className="w-3.5 h-3.5 text-outline" />
        <ScoreBadge score={score} />
      </button>
      {open && <ChecksPopover checks={checks} />}
    </div>
  );
}

function ChecksPopover({ checks }: { checks: Check[] }) {
  return (
    <div className="absolute right-0 top-full mt-2 z-20 w-[min(300px,calc(100vw-48px))] rounded-xl bg-white shadow-xl border border-[#c7c4d8]/40 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-outline mb-2">How this score is worked out</p>
      <ChecksList checks={checks} />
    </div>
  );
}

export function ChecksList({ checks }: { checks: Check[] }) {
  return (
    <ul className="space-y-1.5">
      {checks.map((c) => (
        <li key={c.label} className="flex items-start gap-2 text-xs text-on-surface">
          <Icon
            icon={c.ok ? 'solar:check-circle-bold' : 'solar:close-circle-linear'}
            className={`w-4 h-4 shrink-0 ${c.ok ? 'text-emerald-600' : 'text-slate-400'}`}
          />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

/** A "Suggestions" panel under a field, collapsible, with header actions */
export function SuggestionPanel({
  title = 'Suggestions',
  actions,
  children,
  defaultOpen = true,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2 rounded-xl border border-primary-100 bg-primary-50/40">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
          <Icon icon="solar:magic-stick-3-linear" className="w-4 h-4 text-primary" />
          {title}
        </span>
        <span className="flex items-center gap-1">
          {open && actions}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Hide suggestions' : 'Show suggestions'}
            className="p-1 rounded-md text-outline hover:text-on-surface hover:bg-white"
          >
            <Icon icon="solar:alt-arrow-down-linear" className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </span>
      </div>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

export function IconAction({ icon, label, onClick, disabled }: { icon: string; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="p-1.5 rounded-md text-outline hover:text-primary hover:bg-white disabled:opacity-40"
    >
      <Icon icon={icon} className="w-4 h-4" />
    </button>
  );
}

/** Text with the given phrases highlighted, like vidIQ's keyword marks */
export function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  const targets = phrases.map(normalize).filter(Boolean).sort((a, b) => b.length - a.length);
  if (!targets.length) return <>{text}</>;
  // Match case-insensitively on the original text, allowing any spacing between words
  const pattern = new RegExp(
    `(${targets.map((t) => t.split(' ').map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\-]+')).join('|')})`,
    'gi'
  );
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-primary-100 px-0.5 text-primary-800">
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
