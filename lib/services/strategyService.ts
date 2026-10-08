/**
 * Service layer for strategy generation and management.
 *
 * Coordinates between the Strategist Agent (generation) and the Strategy
 * Repository (persistence), ensuring errors during generation never
 * result in an incomplete database record.
 */

import { StrategyInput, StrategyRecord, newStrategyRecord } from '../models/strategy';
import { StrategyRepository } from '../db/strategyRepository';

export interface StrategistAgentLike {
  generateStrategy(input: StrategyInput): Promise<StrategyRecord['strategy_output']>;
}

/** Thrown when a generation finishes after its request was cancelled; the result is not saved. */
export class GenerationCancelledError extends Error {
  constructor() {
    super('Strategy generation was cancelled before it finished; the result was not saved.');
    this.name = 'GenerationCancelledError';
  }
}

export class StrategyService {
  constructor(private agent: StrategistAgentLike, private repository: StrategyRepository) {}

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
    const output = await this.agent.generateStrategy(input);
    if (options.signal?.aborted) {
      console.info(`Discarding strategy for brand "${input.brand_name}": the request was cancelled before generation finished`);
      throw new GenerationCancelledError();
    }
    const record = newStrategyRecord(input, userId, output);
    return this.repository.createStrategy(record);
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
