'use client';

import { useCallback, useEffect, useState } from 'react';
import { WizardShell } from '@/components/strategist/WizardShell';
import { WelcomeStep } from '@/components/strategist/WelcomeStep';
import { BrandStep, PlatformId } from '@/components/strategist/BrandStep';
import { NicheStep, Niche, NicheTopic } from '@/components/strategist/NicheStep';
import { listStrategies } from '@/lib/api/strategyClient';

const TOTAL_STEPS = 7;

type Screen = 'welcome' | 'brand' | 'niche' | 'audience';

// Step number and progress shown in the top bar for each screen
const SCREEN_PROGRESS: Record<Screen, { step: number; progress: number }> = {
  welcome: { step: 1, progress: 7 },
  brand: { step: 1, progress: 14 },
  niche: { step: 2, progress: 28 },
  audience: { step: 3, progress: 43 },
};

export default function StrategistPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [brandName, setBrandName] = useState('');
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [topics, setTopics] = useState<NicheTopic[]>([]);

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
  const goToAudience = useCallback(() => setScreen('audience'), []);

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

      {screen === 'niche' && (
        <NicheStep
          brandName={brandName}
          platforms={platforms}
          niches={niches}
          topics={topics}
          onNichesChange={setNiches}
          onTopicsChange={setTopics}
          onBack={goToBrand}
          onContinue={goToAudience}
        />
      )}

      {/* Placeholder until the Screen 4 design is built */}
      {screen === 'audience' && (
        <div className="w-full max-w-[640px] mx-auto bg-white rounded-2xl border border-slate-200/70 p-10 text-center">
          <p className="text-[15px] font-semibold text-slate-900">Who&apos;s watching? is coming next.</p>
          <button
            type="button"
            onClick={goToNiche}
            className="mt-5 text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to niche &amp; core topic
          </button>
        </div>
      )}
    </WizardShell>
  );
}
