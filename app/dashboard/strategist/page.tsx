'use client';

import { useCallback, useEffect, useState } from 'react';
import { WizardShell } from '@/components/strategist/WizardShell';
import { WelcomeStep } from '@/components/strategist/WelcomeStep';
import { BrandStep, PlatformId } from '@/components/strategist/BrandStep';
import { NicheStep, Niche, NicheTopic } from '@/components/strategist/NicheStep';
import { AudienceStep, SkillLevel } from '@/components/strategist/AudienceStep';
import { listStrategies } from '@/lib/api/strategyClient';

const TOTAL_STEPS = 7;

type Screen = 'welcome' | 'brand' | 'niche' | 'audience' | 'content';

// Step number and progress shown in the top bar for each screen
const SCREEN_PROGRESS: Record<Screen, { step: number; progress: number }> = {
  welcome: { step: 1, progress: 7 },
  brand: { step: 1, progress: 14 },
  niche: { step: 2, progress: 28 },
  audience: { step: 4, progress: 57 },
  content: { step: 5, progress: 71 },
};

export default function StrategistPage() {
  const [screen, setScreen] = useState<Screen>('welcome');
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [brandName, setBrandName] = useState('');
  const [platforms, setPlatforms] = useState<PlatformId[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [topics, setTopics] = useState<NicheTopic[]>([]);
  const [ages, setAges] = useState<string[]>([]);
  const [skill, setSkill] = useState<SkillLevel | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [struggles, setStruggles] = useState<string[]>([]);

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
  const goToContent = useCallback(() => setScreen('content'), []);

  const { step, progress } = SCREEN_PROGRESS[screen];

  return (
    <WizardShell
      step={step}
      totalSteps={TOTAL_STEPS}
      progress={progress}
      {...(screen === 'audience' && {
        background: '#f8f9ff',
        mainClassName: 'flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8 items-center',
      })}
    >
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

      {screen === 'audience' && (
        <AudienceStep
          niches={niches}
          ages={ages}
          skill={skill}
          interests={interests}
          struggles={struggles}
          onAgesChange={setAges}
          onSkillChange={setSkill}
          onInterestsChange={setInterests}
          onStrugglesChange={setStruggles}
          onBack={goToNiche}
          onContinue={goToContent}
        />
      )}

      {/* Placeholder until the next design is built */}
      {screen === 'content' && (
        <div className="w-full max-w-[640px] mx-auto bg-white rounded-2xl border border-slate-200/70 p-10 text-center">
          <p className="text-[15px] font-semibold text-slate-900">What do you create? is coming next.</p>
          <button
            type="button"
            onClick={goToAudience}
            className="mt-5 text-[13px] font-medium text-indigo-600 hover:text-indigo-700"
          >
            ← Back to audience
          </button>
        </div>
      )}
    </WizardShell>
  );
}
