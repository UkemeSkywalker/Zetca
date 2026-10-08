/**
 * Service layer for strategy generation and management.
 *
 * Coordinates between the Strategist Agent (generation) and the Strategy
 * Repository (persistence), ensuring errors during generation never
 * result in an incomplete database record.
 */

import { ChannelDescription, PlatformId, QuizAnswers, StrategyInput, StrategyRecord, newStrategyRecord } from '../models/strategy';
import { StrategyRepository } from '../db/strategyRepository';

export interface StrategistAgentLike {
  generateStrategy(input: StrategyInput): Promise<StrategyRecord['strategy_output']>;
}

/** Generates strategies from quiz answers, including channel descriptions */
export interface QuizStrategistAgentLike extends StrategistAgentLike {
  regenerateDescription(
    brandName: string,
    quiz: QuizAnswers,
    platform: PlatformId,
    previous?: ChannelDescription
  ): Promise<ChannelDescription>;
}

/** Thrown when a strategy can't have its descriptions regenerated (not from the quiz, or platform not chosen) */
export class DescriptionNotAvailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DescriptionNotAvailableError';
  }
}

/** Thrown when a generation finishes after its request was cancelled; the result is not saved. */
export class GenerationCancelledError extends Error {
  constructor() {
    super('Strategy generation was cancelled before it finished; the result was not saved.');
    this.name = 'GenerationCancelledError';
  }
}

export class StrategyService {
  constructor(
    private agent: StrategistAgentLike,
    private repository: StrategyRepository,
    private quizAgent?: QuizStrategistAgentLike
  ) {}

  /**
   * Generate a strategy via the agent and store it. If generation fails,
   * no database record is created (the agent call happens first).
   *
   * If `signal` is aborted while the agent is working (the request timed out),
   * the result is discarded instead of saved, so the user isn't told it failed
   * while a strategy quietly appears in their list.
   */
  async generateAndStoreStrategy(
    input: StrategyInput,
    userId: string,
    options: { signal?: AbortSignal } = {}
  ): Promise<StrategyRecord> {
    // Quiz answers go to the quiz strategist, which also writes channel descriptions
    const agent = input.quiz && this.quizAgent ? this.quizAgent : this.agent;
    const output = await agent.generateStrategy(input);
    if (options.signal?.aborted) {
      console.info(`Discarding strategy for brand "${input.brand_name}": the request was cancelled before generation finished`);
      throw new GenerationCancelledError();
    }
    const record = newStrategyRecord(input, userId, output);
    return this.repository.createStrategy(record);
  }

  /**
   * Regenerate one platform's channel description for a quiz strategy and save it.
   * Returns null if the strategy doesn't exist for this user.
   */
  async regenerateChannelDescription(
    strategyId: string,
    userId: string,
    platform: PlatformId
  ): Promise<ChannelDescription | null> {
    const record = await this.repository.getStrategyById(strategyId, userId);
    if (!record) return null;
    if (!record.quiz || !this.quizAgent) {
      throw new DescriptionNotAvailableError('This strategy has no channel descriptions to regenerate.');
    }
    if (!record.quiz.platforms.includes(platform)) {
      throw new DescriptionNotAvailableError(`This strategy doesn't include ${platform}.`);
    }

    const descriptions = record.strategy_output.channel_descriptions ?? [];
    const previous = descriptions.find((d) => d.platform === platform);
    const fresh = await this.quizAgent.regenerateDescription(record.brand_name, record.quiz, platform, previous);

    const updated = record.quiz.platforms.flatMap((p) => {
      if (p === platform) return [fresh];
      const existing = descriptions.find((d) => d.platform === p);
      return existing ? [existing] : [];
    });
    await this.repository.updateChannelDescriptions(strategyId, userId, updated);
    return fresh;
  }

  /**
   * Delete a user's strategy.
   * Returns 'deleted', 'not_found', or 'forbidden' (it belongs to another user).
   */
  async deleteStrategy(strategyId: string, userId: string): Promise<'deleted' | 'not_found' | 'forbidden'> {
    const [strategy, belongsToOtherUser] = await this.getStrategy(strategyId, userId);
    if (belongsToOtherUser) return 'forbidden';
    if (strategy === null) return 'not_found';
    await this.repository.deleteStrategy(strategyId, userId);
    return 'deleted';
  }

  /** All strategies for a user, sorted by created_at descending. */
  async getUserStrategies(userId: string): Promise<StrategyRecord[]> {
    return this.repository.listStrategiesByUser(userId);
  }

  /**
   * Retrieve a strategy by ID with user isolation.
   * Returns [record, existsForOtherUser].
   */
  async getStrategy(strategyId: string, userId: string): Promise<[StrategyRecord | null, boolean]> {
    const exists = await this.repository.strategyExists(strategyId);
    const strategy = await this.repository.getStrategyById(strategyId, userId);
    if (exists && strategy === null) return [null, true];
    return [strategy, false];
  }
}
