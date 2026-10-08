'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ResultView } from '@/components/strategist/ResultView';
import { getStrategy, StrategyAPIError } from '@/lib/api/strategyClient';
import type { StrategyRecord } from '@/types/strategy';

/** A generated strategy with its channel descriptions: /dashboard/strategist/result?id=… */
export default function StrategyResultPage() {
  const [strategy, setStrategy] = useState<StrategyRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    (id ? getStrategy(id) : Promise.reject(new Error('No strategy was selected.')))
      .then(setStrategy)
      .catch((err) =>
        setError(err instanceof StrategyAPIError || !id ? (err as Error).message : 'Couldn’t load this strategy.')
      );
  }, []);

  if (error) {
    return (
      <div className="max-w-[640px] mx-auto bg-white rounded-2xl p-8 shadow-sm text-center font-heading">
        <p className="text-[15px] font-semibold text-[#0b1c30]">{error}</p>
        <Link href="/dashboard/strategist" className="inline-block mt-4 text-[13px] font-semibold text-[#3525cd] hover:underline">
          Go to your strategies
        </Link>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex flex-col w-full max-w-[1280px] mx-auto gap-6" aria-busy="true" aria-label="Loading strategy">
        <div className="h-9 w-56 rounded-lg bg-white/70 animate-pulse" />
        <div className="h-72 rounded-2xl bg-white/70 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/70 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return <ResultView strategy={strategy} />;
}
