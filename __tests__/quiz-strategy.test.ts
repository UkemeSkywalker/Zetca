/**
 * @jest-environment node
 */

import { descriptionLength, fitToLimit } from '@/lib/strategist/descriptions';
import {
  StrategyService,
  DescriptionNotAvailableError,
  type QuizStrategistAgentLike,
  type StrategistAgentLike,
} from '@/lib/services/strategyService';
import type { StrategyRepository } from '@/lib/db/strategyRepository';
import type { ChannelDescription, QuizAnswers, StrategyInput, StrategyRecord } from '@/lib/models/strategy';

const quiz: QuizAnswers = {
  platforms: ['youtube', 'instagram'],
  niches: [{ label: 'Fitness', emoji: '💪' }],
  topics: [{ niche: 'Fitness', topic: 'Home workouts' }],
  age_ranges: ['25–34'],
  skill_level: 'beginner',
  interests: [],
  struggles: [],
  content_types: ['tutorials'],
  cadence: 3,
  primary_keyword: 'home workouts for beginners',
  secondary_keywords: ['no equipment workout'],
  goal: 'grow',
};

const baseOutput: StrategyRecord['strategy_output'] = {
  content_pillars: ['a', 'b', 'c'],
  posting_schedule: '3 per week',
  platform_recommendations: [
    { platform: 'youtube', rationale: 'r', priority: 'high' },
    { platform: 'instagram', rationale: 'r', priority: 'medium' },
  ],
  content_themes: ['a', 'b', 'c', 'd', 'e'],
  engagement_tactics: ['a', 'b', 'c', 'd'],
  visual_prompts: ['a', 'b'],
};

const description = (platform: ChannelDescription['platform'], hook: string): ChannelDescription => ({
  platform,
  hook,
  audience: 'For busy beginners.',
  content: 'Quick routines and tips.',
  value: 'New videos weekly.',
  cta: 'Subscribe!',
});

describe('fitToLimit', () => {
  it('leaves a description that already fits unchanged', () => {
    const d = description('tiktok', 'Home workouts');
    expect(fitToLimit(d, 200)).toEqual(d);
  });

  it('never returns a description over the limit', () => {
    const long = { ...description('tiktok', 'Home workouts for beginners that fit any schedule'), content: 'x '.repeat(200) };
    for (const limit of [80, 150, 160]) {
      expect(descriptionLength(fitToLimit(long, limit))).toBeLessThanOrEqual(limit);
    }
  });

  it('drops the content part before touching the hook', () => {
    const d = { ...description('instagram', 'Home workouts for beginners'), content: 'y'.repeat(100) };
    const fitted = fitToLimit(d, 100);
    expect(fitted.content).toBe('');
    expect(fitted.hook).toBe('Home workouts for beginners');
  });
});

function makeRepository(record?: StrategyRecord) {
  const createStrategy = jest.fn(async (r: StrategyRecord) => r);
  const updateChannelDescriptions = jest.fn(async () => {});
  const getStrategyById = jest.fn(async () => record ?? null);
  return {
    repository: { createStrategy, updateChannelDescriptions, getStrategyById } as unknown as StrategyRepository,
    createStrategy,
    updateChannelDescriptions,
  };
}

describe('StrategyService with quiz answers', () => {
  const input: StrategyInput = { brand_name: 'Fit with Ade', industry: 'Fitness', target_audience: 'Beginners', goals: 'Grow', quiz };

  it('uses the quiz strategist and stores the quiz answers', async () => {
    const { repository, createStrategy } = makeRepository();
    const plainAgent: StrategistAgentLike = { generateStrategy: jest.fn(async () => baseOutput) };
    const quizAgent: QuizStrategistAgentLike = {
      generateStrategy: jest.fn(async () => ({ ...baseOutput, channel_descriptions: [description('youtube', 'Hook')] })),
      regenerateDescription: jest.fn(),
    };
    const service = new StrategyService(plainAgent, repository, quizAgent);

    const record = await service.generateAndStoreStrategy(input, 'user-1');

    expect(quizAgent.generateStrategy).toHaveBeenCalled();
    expect(plainAgent.generateStrategy).not.toHaveBeenCalled();
    expect(record.quiz).toEqual(quiz);
    expect(createStrategy).toHaveBeenCalledWith(expect.objectContaining({ quiz }));
  });

  it('uses the plain strategist when there are no quiz answers', async () => {
    const { repository } = makeRepository();
    const plainAgent: StrategistAgentLike = { generateStrategy: jest.fn(async () => baseOutput) };
    const quizAgent: QuizStrategistAgentLike = { generateStrategy: jest.fn(), regenerateDescription: jest.fn() };
    const service = new StrategyService(plainAgent, repository, quizAgent);

    const record = await service.generateAndStoreStrategy({ ...input, quiz: undefined }, 'user-1');

    expect(plainAgent.generateStrategy).toHaveBeenCalled();
    expect(quizAgent.generateStrategy).not.toHaveBeenCalled();
    expect(record.quiz).toBeUndefined();
  });

  it('regenerates one platform and saves it, keeping the others', async () => {
    const existing: StrategyRecord = {
      id: 's1',
      user_id: 'user-1',
      brand_name: 'Fit with Ade',
      industry: 'Fitness',
      target_audience: 'Beginners',
      goals: 'Grow',
      strategy_output: { ...baseOutput, channel_descriptions: [description('youtube', 'Old'), description('instagram', 'Insta')] },
      quiz,
      created_at: new Date().toISOString(),
    };
    const { repository, updateChannelDescriptions } = makeRepository(existing);
    const fresh = description('youtube', 'New');
    const quizAgent: QuizStrategistAgentLike = { generateStrategy: jest.fn(), regenerateDescription: jest.fn(async () => fresh) };
    const service = new StrategyService({ generateStrategy: jest.fn() }, repository, quizAgent);

    const result = await service.regenerateChannelDescription('s1', 'user-1', 'youtube');

    expect(result).toEqual(fresh);
    expect(updateChannelDescriptions).toHaveBeenCalledWith('s1', 'user-1', [fresh, description('instagram', 'Insta')]);
  });

  it('refuses to regenerate a platform the strategy does not include', async () => {
    const existing = {
      id: 's1',
      user_id: 'user-1',
      brand_name: 'Fit with Ade',
      industry: 'Fitness',
      target_audience: 'Beginners',
      goals: 'Grow',
      strategy_output: baseOutput,
      quiz,
      created_at: '',
    } as StrategyRecord;
    const { repository } = makeRepository(existing);
    const quizAgent: QuizStrategistAgentLike = { generateStrategy: jest.fn(), regenerateDescription: jest.fn() };
    const service = new StrategyService({ generateStrategy: jest.fn() }, repository, quizAgent);

    await expect(service.regenerateChannelDescription('s1', 'user-1', 'tiktok')).rejects.toBeInstanceOf(DescriptionNotAvailableError);
  });

  it('returns null when the strategy does not exist for the user', async () => {
    const { repository } = makeRepository(undefined);
    const service = new StrategyService({ generateStrategy: jest.fn() }, repository, { generateStrategy: jest.fn(), regenerateDescription: jest.fn() });
    await expect(service.regenerateChannelDescription('missing', 'user-1', 'youtube')).resolves.toBeNull();
  });
});
