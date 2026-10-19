/**
 * Service layer for scheduling operations.
 *
 * Coordinates between the Scheduler Agent, Scheduler Repository, Copy
 * Repository, Strategy Repository and Media Repository, enforcing user
 * isolation and data integrity.
 */

import {
  AutoScheduleOutput,
  ManualScheduleInput,
  ScheduledPostRecord,
  ScheduledPostUpdate,
  dueAtOf,
  newScheduledPostRecord,
} from '../models/scheduler';
import { StrategyRecord } from '../models/strategy';
import { CopyRecord } from '../models/copy';
import { OTHER_COPIES_SET, normalizePlatform } from '../models/copyConstants';
import { SchedulerRepository, PostUpdates } from '../db/schedulerRepository';
import { CopyRepository } from '../db/copyRepository';
import { StrategyRepository } from '../db/strategyRepository';
import { MediaRepository } from '../db/mediaRepository';
import { ApiError } from '../errors';
import { isValidTimeZone, zonedToUtcSlot } from '../scheduling/time';

export interface SchedulerAgentLike {
  autoSchedule(
    strategyData: Record<string, unknown>,
    copiesData: Record<string, unknown>[],
    timeZone?: string
  ): Promise<AutoScheduleOutput>;
}

/** Most copies sent to the agent in one auto-schedule; run it again to schedule the rest */
export const MAX_AUTO_SCHEDULE = 50;
/** How far a clashing slot is moved, repeatedly, until it's free */
const SLOT_STEP_MS = 30 * 60_000;

const STRATEGY_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

/** Simple string hash matching the spirit of Python's hash() % len for consistent color assignment. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

const slotKey = (platform: string, date: string, time: string) => `${platform}|${date}|${time}`;

function utcSlotOf(ms: number): { date: string; time: string } {
  const iso = new Date(ms).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

export class SchedulerService {
  constructor(
    private agent: SchedulerAgentLike,
    private schedulerRepository: SchedulerRepository,
    private copyRepository: CopyRepository,
    private strategyRepository: StrategyRepository,
    private mediaRepository?: MediaRepository
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

  /** Throws 403 unless the media exists and belongs to the user */
  private async assertOwnsMedia(mediaId: string, userId: string): Promise<void> {
    if (!this.mediaRepository) return;
    const media = await this.mediaRepository.getMediaById(mediaId);
    if (media === null) throw new ApiError('Media not found', 404);
    if (media.userId !== userId) {
      throw new ApiError('Access denied: You do not have permission to use this media', 403);
    }
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
   * Auto-schedule one copy set (default: the newest) via the AI agent.
   * Copies already scheduled are skipped, so running it again picks up where
   * it left off; at most MAX_AUTO_SCHEDULE copies are scheduled per run.
   * Times are chosen in the user's timezone and stored in UTC. Nothing is
   * saved if `signal` aborts (e.g. the request timed out) before the agent returns.
   */
  async autoSchedule(
    strategyId: string,
    userId: string,
    { setId, timezone, signal }: { setId?: string; timezone?: string; signal?: AbortSignal } = {}
  ): Promise<ScheduledPostRecord[]> {
    const strategy = await this.getStrategyWithOwnership(strategyId, userId);
    const timeZone = timezone && isValidTimeZone(timezone) ? timezone : 'UTC';

    const [copies, existing] = await Promise.all([
      this.copyRepository.listCopiesByStrategy(strategyId),
      this.schedulerRepository.listPostsByUser(userId),
    ]);
    if (!copies.length) throw new ApiError('No copies available to schedule for this strategy', 400);

    const alreadyScheduled = new Set(existing.map((p) => p.copy_id));
    const batch = this.pickCopySet(copies, setId, alreadyScheduled)
      .filter((c) => !alreadyScheduled.has(c.id))
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(0, MAX_AUTO_SCHEDULE);
    if (!batch.length) throw new ApiError('Every copy in this set is already scheduled', 400);

    const strategyData = {
      brand_name: strategy.brand_name,
      industry: strategy.industry,
      target_audience: strategy.target_audience,
      goals: strategy.goals,
      ...strategy.strategy_output,
    };
    const copiesData = batch.map((c) => ({ id: c.id, text: c.text, platform: normalizePlatform(c.platform), hashtags: c.hashtags }));

    const agentOutput = await this.agent.autoSchedule(strategyData, copiesData, timeZone);
    if (signal?.aborted) throw new ApiError('Auto-scheduling timed out. Please try again.', 504);

    const copyLookup = new Map(batch.map((c) => [c.id, c]));
    const taken = new Set(existing.filter((p) => p.status !== 'failed').map((p) => slotKey(p.platform, p.scheduled_date, p.scheduled_time)));
    const earliest = Date.now() + 15 * 60_000;
    const strategyColor = this.getStrategyColor(strategyId);
    const records: ScheduledPostRecord[] = [];

    for (const assignment of agentOutput.posts) {
      const copy = copyLookup.get(assignment.copy_id);
      // Ignore copy ids the model made up, and a second assignment for the same copy
      if (!copy) continue;
      copyLookup.delete(copy.id);

      const platform = normalizePlatform(copy.platform);
      let slotMs = Date.parse(agentSlotToUtc(assignment.scheduled_date, assignment.scheduled_time, timeZone));
      if (Number.isNaN(slotMs)) continue;
      // Never in the past: move to the same time tomorrow (or later)
      while (slotMs < earliest) slotMs += 24 * 60 * 60_000;
      // Never two posts on one platform in the same slot
      let slot = utcSlotOf(slotMs);
      while (taken.has(slotKey(platform, slot.date, slot.time))) {
        slotMs += SLOT_STEP_MS;
        slot = utcSlotOf(slotMs);
      }
      taken.add(slotKey(platform, slot.date, slot.time));

      records.push(
        newScheduledPostRecord({
          strategy_id: strategyId,
          copy_id: copy.id,
          user_id: userId,
          content: copy.text,
          platform,
          hashtags: copy.hashtags,
          scheduled_date: slot.date,
          scheduled_time: slot.time,
          status: 'scheduled',
          strategy_color: strategyColor,
          strategy_label: strategy.brand_name,
        })
      );
    }

    if (!records.length) throw new ApiError('The scheduler did not return any usable times. Please try again.', 502);
    if (signal?.aborted) throw new ApiError('Auto-scheduling timed out. Please try again.', 504);
    return this.schedulerRepository.createPosts(records);
  }

  /**
   * The copies in a set: a Copywriter job id, "other" (not in a set), or by
   * default the newest set that still has copies to schedule.
   */
  private pickCopySet(copies: CopyRecord[], setId: string | undefined, alreadyScheduled: Set<string>): CopyRecord[] {
    if (setId === OTHER_COPIES_SET) return copies.filter((c) => !c.job_id);
    if (setId) {
      const set = copies.filter((c) => c.job_id === setId);
      if (!set.length) throw new ApiError('Copy set not found', 404);
      return set;
    }
    // Newest set by its first copy; copies outside any set count as one group
    const groups = new Map<string, CopyRecord[]>();
    for (const c of copies) {
      const key = c.job_id ?? OTHER_COPIES_SET;
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    const started = (list: CopyRecord[]) => list.reduce((min, c) => (c.created_at < min ? c.created_at : min), list[0].created_at);
    const newestFirst = [...groups.values()].sort((a, b) => started(b).localeCompare(started(a)));
    return newestFirst.find((list) => list.some((c) => !alreadyScheduled.has(c.id))) ?? newestFirst[0];
  }

  /** Manually schedule a single copy to a specific date and time. */
  async manualSchedule(input: ManualScheduleInput, userId: string): Promise<ScheduledPostRecord> {
    SchedulerService.validateFutureDate(input.scheduled_date, input.scheduled_time);
    if (input.media_id) await this.assertOwnsMedia(input.media_id, userId);

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

  /**
   * Update a post after verifying ownership. A post being published can't be
   * edited; a post (re)scheduled must be in the future, and starts its
   * publish attempts afresh.
   */
  async updatePost(postId: string, updates: ScheduledPostUpdate, userId: string): Promise<ScheduledPostRecord> {
    const [record, belongsToOther] = await this.getPost(postId, userId);
    if (belongsToOther) throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    if (record === null) throw new ApiError('Scheduled post not found', 404);
    if (record.status === 'publishing') throw new ApiError('This post is being published right now, so it can’t be changed', 409);
    if (updates.media_id) await this.assertOwnsMedia(updates.media_id, userId);

    const updateDict: PostUpdates = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) (updateDict as Record<string, unknown>)[key] = value;
    }
    if (Object.keys(updateDict).length === 0) return record;

    const date = updates.scheduled_date ?? record.scheduled_date;
    const time = updates.scheduled_time ?? record.scheduled_time;
    const timeChanged = updates.scheduled_date !== undefined || updates.scheduled_time !== undefined;
    const status = updates.status ?? record.status;
    const nowScheduled = status === 'scheduled' && (timeChanged || record.status !== 'scheduled');

    if (nowScheduled) {
      SchedulerService.validateFutureDate(date, time);
      // A fresh schedule gets fresh attempts
      Object.assign(updateDict, { publish_attempts: 0, next_attempt_at: null, last_error_code: null, last_error: null });
    }
    if (timeChanged) updateDict.due_at = dueAtOf(date, time);

    const updated = await this.schedulerRepository.updatePost(postId, updateDict, {
      expectedStatus: ['draft', 'scheduled', 'published', 'failed'],
    });
    if (updated) return updated;
    // It was deleted, or a publisher claimed it, since we read it
    if (!(await this.schedulerRepository.postExists(postId))) throw new ApiError('Scheduled post not found', 404);
    throw new ApiError('This post is being published right now, so it can’t be changed', 409);
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

/** The agent's local date and time as a UTC ISO string ("" if it isn't a valid date and time) */
function agentSlotToUtc(date: string, time: string, timeZone: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return '';
  const slot = zonedToUtcSlot(date, time, timeZone);
  return `${slot.date}T${slot.time}:00Z`;
}

