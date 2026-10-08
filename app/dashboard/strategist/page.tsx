'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardShell } from '@/components/strategist/WizardShell';
import { WelcomeStep } from '@/components/strategist/WelcomeStep';
import { BrandStep, PlatformId } from '@/components/strategist/BrandStep';
import { NicheStep, Niche, NicheTopic } from '@/components/strategist/NicheStep';
import { AudienceStep, SkillLevel } from '@/components/strategist/AudienceStep';
import { ContentStep, GoalId, CONTENT_TYPES, GOALS } from '@/components/strategist/ContentStep';
import { ReviewStep, ReviewSection } from '@/components/strategist/ReviewStep';
import { PLATFORMS } from '@/components/strategist/BrandStep';
import { summariseAges } from '@/components/strategist/StrategyRail';
import { listStrategies, generateStrategyRecord, StrategyAPIError } from '@/lib/api/strategyClient';

const TOTAL_STEPS = 7;

type Screen = 'welcome' | 'brand' | 'niche' | 'audience' | 'content' | 'review';

// Step number and progress shown in the top bar for each screen
const SCREEN_PROGRESS: Record<Screen, { step: number; progress: number }> = {
  welcome: { step: 1, progress: 7 },
  brand: { step: 1, progress: 14 },
  niche: { step: 2, progress: 28 },
  audience: { step: 4, progress: 57 },
  content: { step: 5, progress: 71 },
  review: { step: 7, progress: 100 },
};

export default function StrategistPage() {
  const router = useRouter();
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
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [cadence, setCadence] = useState(3);
  const [primaryKeyword, setPrimaryKeyword] = useState<string | null>(null);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

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
  const goToReview = useCallback(() => setScreen('review'), []);

  const selectedContentTypes = useMemo(() => CONTENT_TYPES.filter((c) => contentTypes.includes(c.id)), [contentTypes]);
  const goalInfo = useMemo(() => GOALS.find((g) => g.id === goal) ?? null, [goal]);

  const editSection = useCallback((section: ReviewSection) => setScreen(section), []);

  // The current generator takes four text fields, so the quiz answers are
  // summarised into them until the agent accepts the structured answers
  const generate = useCallback(async () => {
    setGenerating(true);
    setGenerateError(null);
    const platformNames = platforms.map((id) => PLATFORMS.find((p) => p.id === id)?.name ?? id);
    const industry = niches
      .map((n) => {
        const picked = topics.filter((t) => t.niche === n.label).map((t) => t.topic);
        return picked.length ? `${n.label} (${picked.join(', ')})` : n.label;
      })
      .join('; ');
    const audienceParts = [
      ages.length ? `Ages ${summariseAges(ages)}` : null,
      skill ? `${skill} level` : null,
      interests.length ? `interested in ${interests.join(', ')}` : null,
      struggles.length ? `struggling with ${struggles.join(', ')}` : null,
    ].filter(Boolean);
    const goals = [
      goalInfo ? `Main goal: ${goalInfo.label}.` : null,
      `Platforms: ${platformNames.join(', ')}.`,
      `Content: ${selectedContentTypes.map((c) => c.label).join(', ')}, ${cadence} posts per week.`,
      primaryKeyword ? `Main keyword: ${primaryKeyword}.` : null,
      secondaryKeywords.length ? `Other keywords: ${secondaryKeywords.join(', ')}.` : null,
    ]
      .filter(Boolean)
      .join(' ');

    try {
      const id = await generateStrategyRecord({
        brandName,
        industry,
        targetAudience: audienceParts.join('; '),
        goals,
      });
      router.push(`/dashboard/strategist/saved?id=${encodeURIComponent(id)}`);
    } catch (err) {
      setGenerateError(err instanceof StrategyAPIError ? err.message : 'Strategy generation failed. Please try again.');
      setGenerating(false);
    }
  }, [platforms, niches, topics, ages, skill, interests, struggles, goalInfo, selectedContentTypes, cadence, primaryKeyword, secondaryKeywords, brandName, router]);

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
      {...(screen === 'review' && {
        background: '#f8f9ff',
        mainClassName: 'flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-8 py-8 sm:py-10 flex flex-col items-center',
      })}
      {...(screen === 'content' && {
        background: '#f9f8fb',
        mainClassName: 'flex-1 max-w-7xl w-full mx-auto px-6 py-8',
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

      {screen === 'content' && (
        <ContentStep
          brandName={brandName}
          platforms={platforms}
          ages={ages}
          interests={interests}
          struggles={struggles}
          niches={niches}
          topics={topics}
          skill={skill}
          contentTypes={contentTypes}
          cadence={cadence}
          primaryKeyword={primaryKeyword}
          secondaryKeywords={secondaryKeywords}
          goal={goal}
          onContentTypesChange={setContentTypes}
          onCadenceChange={setCadence}
          onPrimaryKeywordChange={setPrimaryKeyword}
          onSecondaryKeywordsChange={setSecondaryKeywords}
          onGoalChange={setGoal}
          onBack={goToAudience}
          onContinue={goToReview}
        />
      )}

      {screen === 'review' && (
        <ReviewStep
          brandName={brandName}
          platforms={platforms}
          niches={niches}
          topics={topics}
          ages={ages}
          skill={skill}
          interests={interests}
          struggles={struggles}
          contentTypes={selectedContentTypes}
          cadence={cadence}
          primaryKeyword={primaryKeyword}
          secondaryKeywords={secondaryKeywords}
          goal={goalInfo ? { emoji: goalInfo.emoji, label: goalInfo.label } : null}
          generating={generating}
          error={generateError}
          onEdit={editSection}
          onBack={goToContent}
          onGenerate={generate}
        />
      )}
    </WizardShell>
  );
}
