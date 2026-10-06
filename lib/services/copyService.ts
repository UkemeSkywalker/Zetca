/**
 * Service layer for copy generation, retrieval, and chat refinement.
 *
 * Coordinates between the Copywriter Agent, Copy Repository, and Strategy
 * Repository, ensuring errors during agent calls never result in
 * incomplete or corrupted database records.
 */

import { CopyRecord, CopyOutput, ChatResponse, newCopyRecord } from '../models/copy';
import { StrategyRecord } from '../models/strategy';
import { CopyRepository } from '../db/copyRepository';
import { StrategyRepository } from '../db/strategyRepository';
import { ApiError } from '../errors';

export interface CopywriterAgentLike {
  generateCopies(strategyData: Record<string, any>): Promise<CopyOutput>;
  chatRefine(
    copyText: string,
    platform: string,
    hashtags: string[],
    strategyData: Record<string, any>,
    userMessage: string
  ): Promise<ChatResponse>;
}

/** Normalize platform names to lowercase, collapsing Twitter/X/TikTok variants to "x". */
function normalizePlatform(p: string): string {
  const lower = p.toLowerCase().trim();
  if (['twitter', 'twitter/x', 'x (twitter)', 'x/twitter', 'tiktok'].includes(lower)) return 'x';
  return lower;
}

function strategyToAgentData(strategy: StrategyRecord): Record<string, any> {
  return {
    brand_name: strategy.brand_name,
    industry: strategy.industry,
    target_audience: strategy.target_audience,
    goals: strategy.goals,
    ...strategy.strategy_output,
  };
}

export class CopyService {
  constructor(
    public agent: CopywriterAgentLike,
    private copyRepository: CopyRepository,
    private strategyRepository: StrategyRepository
  ) {}

  /** Fetch a strategy and verify ownership. Throws 404/403 on failure. */
  async getStrategyWithOwnership(strategyId: string, userId: string): Promise<StrategyRecord> {
    const exists = await this.strategyRepository.strategyExists(strategyId);
    if (!exists) throw new ApiError('Strategy not found', 404);

    const strategy = await this.strategyRepository.getStrategyById(strategyId, userId);
    if (strategy === null) {
      throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    }
    return strategy;
  }

  /** Generate copies from a strategy. If the agent fails, no copies are stored. */
  async generateCopies(strategyId: string, userId: string): Promise<CopyRecord[]> {
    const strategy = await this.getStrategyWithOwnership(strategyId, userId);

    const strategyData = strategyToAgentData(strategy);
    // Override platforms to only target X, Instagram, LinkedIn, Facebook with 7 copies per platform.
    strategyData.platform_recommendations = [
      { platform: 'Twitter' },
      { platform: 'Instagram' },
      { platform: 'LinkedIn' },
      { platform: 'Facebook' },
    ];

    const output = await this.agent.generateCopies(strategyData);

    const records = output.copies.map((item) =>
      newCopyRecord({
        strategy_id: strategyId,
        user_id: userId,
        text: item.text,
        platform: normalizePlatform(item.platform),
        hashtags: item.hashtags,
      })
    );

    return this.copyRepository.createCopies(records);
  }

  /** All copies for a strategy, after verifying ownership. */
  async getCopiesByStrategy(strategyId: string, userId: string): Promise<CopyRecord[]> {
    await this.getStrategyWithOwnership(strategyId, userId);
    return this.copyRepository.listCopiesByStrategy(strategyId);
  }

  /**
   * Retrieve a single copy with user isolation.
   * Returns [record, false] if found and owned; [null, true] if exists but
   * belongs to another user; [null, false] if it does not exist.
   */
  async getCopy(copyId: string, userId: string): Promise<[CopyRecord | null, boolean]> {
    const exists = await this.copyRepository.copyExists(copyId);
    if (!exists) return [null, false];

    const record = await this.copyRepository.getCopyById(copyId, userId);
    if (record === null) return [null, true];
    return [record, false];
  }

  /**
   * Refine a copy via conversational chat. If the agent fails, the
   * existing copy remains unchanged.
   */
  async chatRefineCopy(copyId: string, message: string, userId: string): Promise<[ChatResponse, CopyRecord]> {
    const [record, belongsToOther] = await this.getCopy(copyId, userId);
    if (belongsToOther) throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    if (record === null) throw new ApiError('Copy not found', 404);

    const strategy = await this.strategyRepository.getStrategyById(record.strategy_id);
    const strategyData = strategy ? strategyToAgentData(strategy) : {};

    const chatResponse = await this.agent.chatRefine(record.text, record.platform, record.hashtags, strategyData, message);

    const updatedRecord = await this.copyRepository.updateCopy(copyId, chatResponse.updated_text, chatResponse.updated_hashtags);

    return [chatResponse, updatedRecord];
  }

  /**
   * Delete a copy with user isolation.
   * Returns [true, false] on success; [false, true] if owned by another
   * user; [false, false] if it does not exist.
   */
  async deleteCopy(copyId: string, userId: string): Promise<[boolean, boolean]> {
    const [record, belongsToOther] = await this.getCopy(copyId, userId);
    if (belongsToOther) return [false, true];
    if (record === null) return [false, false];

    await this.copyRepository.deleteCopy(copyId);
    return [true, false];
  }
}
