'use client';

import { Suspense } from 'react';
import { ResearchChat } from '@/components/strategist/ResearchChat';

/** Talk to Zetca: the conversation and what Zetca finds about the brand */
export default function StrategistChatPage() {
  return (
    <Suspense fallback={<div className="h-96 rounded-2xl bg-white/60 animate-pulse" aria-label="Loading" />}>
      <ResearchChat />
    </Suspense>
  );
}
