'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getAiCredits, type CreditBalance } from '@/lib/api/designApi';

/** The user's AI credits this month, and whether AI is set up at all */
export function useAiCredits() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [available, setAvailable] = useState(true);
  const refresh = useCallback(() => {
    getAiCredits().then(
      (r) => {
        setCredits(r.credits);
        setAvailable(r.available);
      },
      () => undefined
    );
  }, []);
  useEffect(refresh, [refresh]);
  return { credits, available, refresh, setCredits };
}

export const resetDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "12 of 20 AI credits left" with a thin bar */
export function CreditsPill({ credits, className = '' }: { credits: CreditBalance | null; className?: string }) {
  if (!credits) return null;
  const pct = credits.limit ? (credits.left / credits.limit) * 100 : 0;
  return (
    <div className={`inline-flex items-center gap-2.5 rounded-full border border-[#E2E8F0] bg-white px-3.5 py-1.5 ${className}`} title={`Resets on ${resetDate(credits.resetsAt)}`}>
      <Icon icon="lucide:sparkles" className="w-4 h-4 text-primary" aria-hidden />
      <span className="text-[13px] font-semibold text-[#0B1C30]">
        {credits.left} of {credits.limit} AI credits left
      </span>
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden>
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
