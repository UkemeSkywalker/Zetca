'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { StrategyListView } from '@/components/strategist/StrategyListView';
import { TalkToZetca } from '@/components/strategist/TalkToZetca';
import { listStrategies, StrategyAPIError } from '@/lib/api/strategyClient';
import type { StrategyRecord } from '@/types/strategy';

/**
 * Strategist home: Talk to Zetca on top (describe the business, Zetca does
 * the research), then the user's strategies and the step-by-step quiz.
 */
export default function StrategistPage() {
  const [strategies, setStrategies] = useState<StrategyRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStrategies()
      .then((list) => {
        if (cancelled) return;
        setStrategies(list);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof StrategyAPIError ? err.message : 'Couldn’t load your strategies.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="max-w-[640px] mx-auto bg-white rounded-2xl p-8 shadow-sm text-center font-heading">
        <p className="text-[15px] font-semibold text-[#0b1c30]">{error}</p>
        <div className="flex justify-center gap-4 mt-4">
          <button type="button" onClick={() => window.location.reload()} className="text-[13px] font-semibold text-[#3525cd] hover:underline">
            Try again
          </button>
          <Link href="/dashboard/strategist/new" className="text-[13px] font-semibold text-[#3525cd] hover:underline">
            Create a new strategy
          </Link>
        </div>
      </div>
    );
  }

  if (!strategies) {
    return (
      <div className="flex flex-col w-full max-w-[1280px] mx-auto gap-6">
        <TalkToZetca />
        <div className="flex flex-col gap-6" aria-busy="true" aria-label="Loading strategies">
        <div className="flex items-center justify-between">
          <div className="h-9 w-56 rounded-lg bg-white/70 animate-pulse" />
          <div className="h-10 w-44 rounded-xl bg-white/70 animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-white/70 animate-pulse" />
          ))}
        </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full max-w-[1280px] mx-auto gap-8">
      <TalkToZetca />
      <StrategyListView strategies={strategies} />
    </div>
  );
}
