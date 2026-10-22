'use client';

import React from 'react';
import { Icon } from '@iconify/react';

export const CARD = 'bg-white rounded-2xl border border-[#E2E8F0]';
export const INPUT =
  'w-full rounded-xl bg-[#F8F9FF] border border-[#E2E8F0] px-4 py-3 text-sm text-[#0B1C30] placeholder:text-[#777587] focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-colors';
export const LABEL = 'block text-sm font-semibold text-[#0B1C30] mb-2';

export function CostBadge({ cost }: { cost: 'free' | number | 'soon' }) {
  if (cost === 'free') {
    return <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">Free</span>;
  }
  if (cost === 'soon') {
    return <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">Soon</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide">
      <Icon icon="lucide:sparkles" className="w-3 h-3" aria-hidden />
      {cost} {cost === 1 ? 'credit' : 'credits'}
    </span>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  disabled,
  tone = 'light',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  /** "dark" chips sit on the gradient hero */
  tone?: 'light' | 'dark';
}) {
  const styles =
    tone === 'dark'
      ? selected
        ? 'bg-white text-primary border-white'
        : 'bg-white/10 text-white border-white/30 hover:bg-white/20'
      : selected
        ? 'bg-primary text-white border-primary'
        : 'bg-white text-[#464555] border-[#E2E8F0] hover:border-primary/40';
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`h-8 px-3.5 rounded-full border text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
  );
}

export function ContrastBadge({ ratio }: { ratio: number }) {
  const ok = ratio >= 4.5;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
    >
      <Icon icon={ok ? 'lucide:check' : 'lucide:triangle-alert'} className="w-3.5 h-3.5" aria-hidden />
      {ok ? 'High contrast' : 'Hard to read'} · {ratio.toFixed(1)}:1
    </span>
  );
}

export function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 h-11 text-sm font-semibold text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 h-11 text-sm font-semibold text-[#0B1C30] hover:border-primary/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d} ${d === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
