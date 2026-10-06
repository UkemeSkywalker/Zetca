/**
 * Service layer for scheduling operations.
 *
 * Coordinates between the Scheduler Agent, Scheduler Repository, Copy
 * Repository, and Strategy Repository, enforcing user isolation and data
 * integrity.
 */

import {
  AutoScheduleOutput,
  ManualScheduleInput,
  ScheduledPostRecord,
  ScheduledPostUpdate,
  newScheduledPostRecord,
} from '../models/scheduler';
import { StrategyRecord } from '../models/strategy';
import { SchedulerRepository } from '../db/schedulerRepository';
import { CopyRepository } from '../db/copyRepository';
import { StrategyRepository } from '../db/strategyRepository';
import { ApiError } from '../errors';

export interface SchedulerAgentLike {
  autoSchedule(strategyData: Record<string, any>, copiesData: Record<string, any>[]): Promise<AutoScheduleOutput>;
}

const STRATEGY_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

/** Simple string hash matching the spirit of Python's hash() % len for consistent color assignment. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export class SchedulerService {
  constructor(
    private agent: SchedulerAgentLike,
    private schedulerRepository: SchedulerRepository,
    private copyRepository: CopyRepository,
    private strategyRepository: StrategyRepository
  ) {}

  private getStrategyColor(strategyId: string): string {
    return STRATEGY_COLORS[hashString(strategyId) % STRATEGY_COLORS.length];
  }

  /** Throws 400 if the given date/time is in the past (UTC). */
  private static validateFutureDate(scheduledDate: string, scheduledTime: string = '23:59'): void {
    const dt = new Date(`${scheduledDate}T${scheduledTime}:00Z`);
    if (Number.isNaN(dt.getTime())) {
      throw new ApiError(`Invalid date or time format: ${scheduledDate} ${scheduledTime}`, 400);
    }
    if (dt.getTime() <= Date.now()) {
      throw new ApiError(
        `Cannot schedule a post in the past. The date ${scheduledDate} at ${scheduledTime} has already passed. Please choose a future date and time.`,
        400
      );
    }
  }

  /** Safety net: if the agent's returned date is today or in the past, bump it to tomorrow. */
  private static ensureFutureDate(scheduledDate: string): string {
    const d = new Date(`${scheduledDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return scheduledDate;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (d.getTime() <= today.getTime()) {
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      return tomorrow.toISOString().slice(0, 10);
    }
    return scheduledDate;
  }

  /** Fetch a strategy and verify ownership. Throws 404/403 on failure. */
  private async getStrategyWithOwnership(strategyId: string, userId: string): Promise<StrategyRecord> {
    const exists = await this.strategyRepository.strategyExists(strategyId);
    if (!exists) throw new ApiError('Strategy not found', 404);
    const strategy = await this.strategyRepository.getStrategyById(strategyId, userId);
    if (strategy === null) {
      throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    }
    return strategy;
  }

  /**
   * Auto-schedule all copies for a strategy via the AI agent. If the
   * agent fails, no records are stored.
   */
  async autoSchedule(strategyId: string, userId: string): Promise<ScheduledPostRecord[]> {
    const strategy = await this.getStrategyWithOwnership(strategyId, userId);

    const copies = await this.copyRepository.listCopiesByStrategy(strategyId);
    if (!copies.length) {
      throw new ApiError('No copies available to schedule for this strategy', 400);
    }

    const strategyData = {
      brand_name: strategy.brand_name,
      industry: strategy.industry,
      target_audience: strategy.target_audience,
      goals: strategy.goals,
      ...strategy.strategy_output,
    };

    const copiesData = copies.map((c) => ({ id: c.id, text: c.text, platform: c.platform, hashtags: c.hashtags }));

    const agentOutput = await this.agent.autoSchedule(strategyData, copiesData);

    const copyLookup = new Map(copies.map((c) => [c.id, c]));
    const strategyColor = this.getStrategyColor(strategyId);
    const strategyLabel = strategy.brand_name;

    const records = agentOutput.posts.map((assignment) => {
      const copy = copyLookup.get(assignment.copy_id);
      const content = copy ? copy.text : '';
      const hashtags = copy ? copy.hashtags : [];
      const platform = assignment.platform || (copy ? copy.platform : '');
      const safeDate = SchedulerService.ensureFutureDate(assignment.scheduled_date);

      return newScheduledPostRecord({
        strategy_id: strategyId,
        copy_id: assignment.copy_id,
        user_id: userId,
        content,
        platform,
        hashtags,
        scheduled_date: safeDate,
        scheduled_time: assignment.scheduled_time,
        status: 'scheduled',
        strategy_color: strategyColor,
        strategy_label: strategyLabel,
      });
    });

    return this.schedulerRepository.createPosts(records);
  }

  /** Manually schedule a single copy to a specific date and time. */
  async manualSchedule(input: ManualScheduleInput, userId: string): Promise<ScheduledPostRecord> {
    SchedulerService.validateFutureDate(input.scheduled_date, input.scheduled_time);

    // If content is provided directly (manual post from calendar), skip copy lookup.
    if (input.content && input.copy_id.startsWith('manual')) {
      const record = newScheduledPostRecord({
        strategy_id: 'manual',
        copy_id: input.copy_id,
        user_id: userId,
        content: input.content,
        platform: input.platform,
        hashtags: [],
        scheduled_date: input.scheduled_date,
        scheduled_time: input.scheduled_time,
        status: 'scheduled',
        media_id: input.media_id ?? null,
        media_type: input.media_type ?? null,
      });
      return this.schedulerRepository.createPost(record);
    }

    const copyExists = await this.copyRepository.copyExists(input.copy_id);
    if (!copyExists) throw new ApiError('Copy not found', 404);

    const copy = await this.copyRepository.getCopyById(input.copy_id, userId);
    if (copy === null) {
      throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    }

    const strategy = await this.strategyRepository.getStrategyById(copy.strategy_id);
    const strategyColor = strategy ? this.getStrategyColor(copy.strategy_id) : '';
    const strategyLabel = strategy ? strategy.brand_name : '';

    const record = newScheduledPostRecord({
      strategy_id: copy.strategy_id,
      copy_id: copy.id,
      user_id: userId,
      content: copy.text,
      platform: input.platform,
      hashtags: copy.hashtags,
      scheduled_date: input.scheduled_date,
      scheduled_time: input.scheduled_time,
      status: 'scheduled',
      strategy_color: strategyColor,
      strategy_label: strategyLabel,
      media_id: input.media_id ?? null,
      media_type: input.media_type ?? null,
    });

    return this.schedulerRepository.createPost(record);
  }

  /**
   * Get a post by ID with user isolation.
   * Returns [record, false] if owned; [null, true] if owned by another
   * user; [null, false] if it does not exist.
   */
  async getPost(postId: string, userId: string): Promise<[ScheduledPostRecord | null, boolean]> {
    const exists = await this.schedulerRepository.postExists(postId);
    if (!exists) return [null, false];

    const record = await this.schedulerRepository.getPostById(postId, userId);
    if (record === null) return [null, true];
    return [record, false];
  }

  async listPostsByUser(userId: string): Promise<ScheduledPostRecord[]> {
    return this.schedulerRepository.listPostsByUser(userId);
  }

  async listPostsByStrategy(strategyId: string, userId: string): Promise<ScheduledPostRecord[]> {
    await this.getStrategyWithOwnership(strategyId, userId);
    return this.schedulerRepository.listPostsByStrategy(strategyId);
  }

  /** Update a post after verifying ownership. */
  async updatePost(postId: string, updates: ScheduledPostUpdate, userId: string): Promise<ScheduledPostRecord> {
    const [record, belongsToOther] = await this.getPost(postId, userId);
    if (belongsToOther) throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    if (record === null) throw new ApiError('Scheduled post not found', 404);

    // Preserve explicit null for media_id/media_type so the repository can REMOVE the attribute.
    const updateDict: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) updateDict[key] = value;
    }

    if (Object.keys(updateDict).length === 0) return record;

    return this.schedulerRepository.updatePost(postId, updateDict);
  }

  async deleteAllPosts(userId: string): Promise<number> {
    return this.schedulerRepository.deleteAllByUser(userId);
  }

  /**
   * Delete a post with user isolation.
   * Returns [true, false] on success; [false, true] if owned by another
   * user; [false, false] if it does not exist.
   */
  async deletePost(postId: string, userId: string): Promise<[boolean, boolean]> {
    const [record, belongsToOther] = await this.getPost(postId, userId);
    if (belongsToOther) return [false, true];
    if (record === null) return [false, false];

    await this.schedulerRepository.deletePost(postId);
    return [true, false];
  }
}
