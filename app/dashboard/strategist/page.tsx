'use client';

import { useCallback, useEffect, useState } from 'react';
import { WizardShell } from '@/components/strategist/WizardShell';
import { WelcomeStep } from '@/components/strategist/WelcomeStep';
import { BrandStep, PlatformId } from '@/components/strategist/BrandStep';
import { listStrategies } from '@/lib/api/strategyClient';

const TOTAL_STEPS = 7;

type Screen = 'welcome' | 'brand' | 'niche';

// Step number and progress shown in the top bar for each screen
const SCREEN_PROGRESS: Record<Screen, { step: number; progress: number }> = {
  welcome: { step: 1, progress: 7 },
  brand: { step: 1, progress: 14 },
  niche: { step: 2, progress: 28 },
};

export default function StrategistPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [brandName, setBrandName] = useState('');
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);

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

  const togglePlatform = useCallback((id: PlatformId) => {
    setPlatforms((current) => (current.includes(id) ? current.filter((p) => p !== id) : [...current, id]));
  }, []);

  const goToBrand = useCallback(() => setScreen('brand'), []);
  const goToNiche = useCallback(() => setScreen('niche'), []);

  const { step, progress } = SCREEN_PROGRESS[screen];

  return (
    <WizardShell step={step} totalSteps={TOTAL_STEPS} progress={progress}>
      {screen === 'welcome' && <WelcomeStep savedCount={savedCount} onStart={goToBrand} />}

      {screen === 'brand' && (
        <BrandStep
          brandName={brandName}
          platforms={platforms}
          onBrandNameChange={setBrandName}
          onTogglePlatform={togglePlatform}
          onContinue={goToNiche}
        />
      )}

      {/* Placeholder until the Screen 3 design is built */}
      {screen === 'niche' && (
        <div className="w-full max-w-[640px] mx-auto bg-white rounded-2xl border border-slate-200/70 p-10 text-center">
          <p className="text-[15px] font-semibold text-slate-900">Niche &amp; core topic is coming next.</p>
          <button
            type="button"
            onClick={goToBrand}
            className="mt-5 text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to brand &amp; platforms
          </button>
        </div>
      )}
    </WizardShell>
  );
}
