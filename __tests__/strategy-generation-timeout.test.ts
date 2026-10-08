/**
 * @jest-environment node
 */

import { StrategyService, GenerationCancelledError, type StrategistAgentLike } from '@/lib/services/strategyService';
import { withTimeout } from '@/lib/api/routeHelpers';
import type { StrategyRepository } from '@/lib/db/strategyRepository';
import type { StrategyInput, StrategyRecord } from '@/lib/models/strategy';

const input: StrategyInput = {
  brand_name: 'Fit with Ade',
  industry: 'Fitness (Home workouts)',
  target_audience: 'Ages 25–44; beginner level',
  goals: 'Main goal: Grow audience.',
};

const output: StrategyRecord['strategy_output'] = {
  content_pillars: ['Workouts', 'Nutrition', 'Mindset'],
  posting_schedule: '3 times per week',
  platform_recommendations: [
    { platform: 'YouTube', rationale: 'Long-form tutorials', priority: 'high' },
    { platform: 'Instagram', rationale: 'Short clips', priority: 'medium' },
  ],
  content_themes: ['a', 'b', 'c', 'd', 'e'],
  engagement_tactics: ['a', 'b', 'c', 'd'],
  visual_prompts: ['a', 'b'],
};

function makeRepository() {
  const createStrategy = jest.fn(async (record: StrategyRecord) => record);
  return { repository: { createStrategy } as unknown as StrategyRepository, createStrategy };
}

/** An agent whose generation finishes only when `finish()` is called */
function makeSlowAgent() {
  let finish: () => void = () => {};
  const agent: StrategistAgentLike = {
    generateStrategy: () =>
      new Promise((resolve) => {
        finish = () => resolve(output);
      }),
  };
  return { agent, finish: () => finish() };
}

describe('StrategyService.generateAndStoreStrategy', () => {
  it('saves the strategy when the request is not cancelled', async () => {
    const { repository, createStrategy } = makeRepository();
    const service = new StrategyService({ generateStrategy: async () => output }, repository);

    const record = await service.generateAndStoreStrategy(input, 'user-1', { signal: new AbortController().signal });

    expect(createStrategy).toHaveBeenCalledTimes(1);
    expect(record.brand_name).toBe('Fit with Ade');
  });

  it('does not save a strategy that finishes after the request was cancelled', async () => {
    const { repository, createStrategy } = makeRepository();
    const { agent, finish } = makeSlowAgent();
    const service = new StrategyService(agent, repository);
    const cancel = new AbortController();
    jest.spyOn(console, 'info').mockImplementation(() => {});

    const pending = service.generateAndStoreStrategy(input, 'user-1', { signal: cancel.signal });
    cancel.abort();
    finish();

    await expect(pending).rejects.toBeInstanceOf(GenerationCancelledError);
    expect(createStrategy).not.toHaveBeenCalled();
  });
});

describe('withTimeout', () => {
  afterEach(() => jest.useRealTimers());

  it('calls onTimeout and rejects with a 504 when the limit is hit', async () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();
    const result = withTimeout(new Promise(() => {}), 120, 'Timed out', onTimeout);

    jest.advanceTimersByTime(120_000);

    await expect(result).rejects.toMatchObject({ message: 'Timed out', statusCode: 504 });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('does not call onTimeout when the work finishes in time', async () => {
    const onTimeout = jest.fn();
    await expect(withTimeout(Promise.resolve('done'), 120, 'Timed out', onTimeout)).resolves.toBe('done');
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('end to end: a timed-out generation is not saved', async () => {
    jest.useFakeTimers();
    const { repository, createStrategy } = makeRepository();
    const { agent, finish } = makeSlowAgent();
    const service = new StrategyService(agent, repository);
    const cancel = new AbortController();
    jest.spyOn(console, 'info').mockImplementation(() => {});

    const request = withTimeout(
      service.generateAndStoreStrategy(input, 'user-1', { signal: cancel.signal }),
      120,
      'Timed out',
      () => cancel.abort()
    );
    jest.advanceTimersByTime(120_000);
    await expect(request).rejects.toMatchObject({ statusCode: 504 });

    // The agent finishes late; nothing should be saved
    finish();
    await Promise.resolve();
    await Promise.resolve();
    expect(createStrategy).not.toHaveBeenCalled();
  });
});
