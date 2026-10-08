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
import { GeneratingStep } from '@/components/strategist/GeneratingStep';
import { PLATFORMS } from '@/components/strategist/BrandStep';
import { summariseAges } from '@/components/strategist/StrategyRail';
import { listStrategies, generateStrategyRecord, getStrategy, StrategyAPIError } from '@/lib/api/strategyClient';
import type { QuizAnswers } from '@/types/strategy';

// Question steps: brand, niche, audience, content & keywords, review
const TOTAL_STEPS = 5;

type Screen = 'welcome' | 'brand' | 'niche' | 'audience' | 'content' | 'review' | 'generating';

// Step number and progress shown in the top bar for each screen; the intro
// and the generating screen sit outside the numbered steps
const SCREEN_PROGRESS: Record<Screen, { step: number | null; progress: number }> = {
  welcome: { step: null, progress: 0 },
  brand: { step: 1, progress: 20 },
  niche: { step: 2, progress: 40 },
  audience: { step: 3, progress: 60 },
  content: { step: 4, progress: 80 },
  review: { step: 5, progress: 100 },
  generating: { step: null, progress: 100 },
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
  const [generateStatus, setGenerateStatus] = useState<'running' | 'done' | 'error'>('running');
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generateRun, setGenerateRun] = useState(0);

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

  // "Edit answers" on a result links here with ?edit=<id>: refill the quiz and open Review
  useEffect(() => {
    const editId = new URLSearchParams(window.location.search).get('edit');
    if (!editId) return;
    getStrategy(editId)
      .then((record) => {
        const quiz = record.quiz;
        if (!quiz) return;
        setBrandName(record.brandName);
        setPlatforms(quiz.platforms);
        setNiches(quiz.niches);
        setTopics(quiz.topics);
        setAges(quiz.age_ranges);
        setSkill(quiz.skill_level);
        setInterests(quiz.interests);
        setStruggles(quiz.struggles);
        setContentTypes(quiz.content_types);
        setCadence(quiz.cadence);
        setPrimaryKeyword(quiz.primary_keyword);
        setSecondaryKeywords(quiz.secondary_keywords);
        setGoal(quiz.goal);
        setScreen('review');
      })
      .catch(() => {
        // Start the quiz fresh if the strategy can't be loaded
      });
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
    setScreen('generating');
    setGenerateRun((run) => run + 1);
    setGenerateStatus('running');
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

    const quiz: QuizAnswers | undefined =
      primaryKeyword && goal
        ? {
            platforms,
            niches,
            topics,
            age_ranges: ages,
            skill_level: skill,
            interests,
            struggles,
            content_types: contentTypes,
            cadence,
            primary_keyword: primaryKeyword,
            secondary_keywords: secondaryKeywords,
            goal,
          }
        : undefined;

    try {
      const id = await generateStrategyRecord({
        brandName,
        industry,
        targetAudience: audienceParts.join('; '),
        goals,
        quiz,
      });
      // Let the finished checklist show briefly before opening the result
      setGenerateStatus('done');
      setTimeout(() => router.push(`/dashboard/strategist/result?id=${encodeURIComponent(id)}`), 900);
    } catch (err) {
      setGenerateError(err instanceof StrategyAPIError ? err.message : 'Strategy generation failed.');
      setGenerateStatus('error');
    }
  }, [platforms, niches, topics, ages, skill, interests, struggles, goal, goalInfo, contentTypes, selectedContentTypes, cadence, primaryKeyword, secondaryKeywords, brandName, router]);

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
      {...(screen === 'generating' && {
        background: '#f8f9ff',
        mainClassName: 'flex-1 w-full flex items-center justify-center p-4 sm:p-6',
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
          generating={false}
          error={null}
          onEdit={editSection}
          onBack={goToContent}
          onGenerate={generate}
        />
      )}

      {screen === 'generating' && (
        <GeneratingStep key={generateRun} status={generateStatus} error={generateError} onRetry={generate} onBackToReview={goToReview} />
      )}
    </WizardShell>
  );
}
