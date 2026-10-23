'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { planOf } from '@/lib/billing/plans';
import { useCredits } from './useCredits';

/** The credit balance in the dashboard header; links to Billing */
export function HeaderCredits() {
  const { credits } = useCredits();
  if (!credits) return null;
  const low = credits.left < Math.max(10, credits.monthly.limit * 0.1);
  return (
    <Link
      href="/dashboard/billing"
      title={`${planOf(credits.plan).name} plan · resets ${new Date(credits.resetsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`}
      className={`inline-flex items-center gap-2 h-10 px-3 rounded-[10px] border text-[13px] font-semibold transition-colors ${
        low ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100' : 'border-slate-200/80 bg-slate-50 text-on-surface hover:bg-slate-100'
      }`}
    >
      <Icon icon="lucide:coins" width={16} height={16} className={low ? 'text-amber-600' : 'text-primary'} aria-hidden="true" />
      <span className="text-inherit">{credits.left.toLocaleString('en-US')}</span>
      <span className="hidden md:inline text-inherit font-medium opacity-70">credits</span>
    </Link>
  );
}
