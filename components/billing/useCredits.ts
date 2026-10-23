'use client';

import { useEffect, useState } from 'react';
import { refreshCredits, subscribeCredits, watchSpending, type CreditBalance } from '@/lib/api/billingClient';

/** The user's credit balance, kept up to date across the page */
export function useCredits(): { credits: CreditBalance | null; refresh: () => Promise<void> } {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  useEffect(() => {
    watchSpending();
    return subscribeCredits(setCredits);
  }, []);
  return { credits, refresh: refreshCredits };
}
