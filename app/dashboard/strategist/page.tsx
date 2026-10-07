'use client';

import { useCallback, useEffect, useState } from 'react';
import { WizardShell } from '@/components/strategist/WizardShell';
import { WelcomeStep } from '@/components/strategist/WelcomeStep';
import { listStrategies } from '@/lib/api/strategyClient';

const TOTAL_STEPS = 7;

export default function StrategistPage() {
  const [step, setStep] = useState(1);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    listStrategies()
      .then((strategies) => {
        if (!cancelled) setSavedCount(strategies.length);
      })
      .catch(() => {
        // The count is optional; the link still works without it
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleStart = useCallback(() => setStep(2), []);

  return (
    <WizardShell step={step} totalSteps={TOTAL_STEPS}>
      {step === 1 && <WelcomeStep savedCount={savedCount} onStart={handleStart} />}

      {/* Placeholder until the Screen 2 design is built */}
      {step > 1 && (
        <div className="max-w-[640px] mx-auto bg-white rounded-[20px] border border-slate-200/70 p-10 text-center">
          <p className="text-[17px] font-semibold text-slate-900">Brand &amp; platforms is coming next.</p>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 text-[15px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to welcome
          </button>
        </div>
      )}
    </WizardShell>
  );
}
