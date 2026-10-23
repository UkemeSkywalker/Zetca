'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { formatCredits } from '@/lib/api/billingClient';

/** "4 credits", shown next to a button that spends them */
export function CreditCost({ credits, className = '' }: { credits: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold text-[#64748B] ${className}`}>
      <Icon icon="lucide:coins" className="w-3.5 h-3.5" aria-hidden />
      {formatCredits(credits)}
    </span>
  );
}
