/**
 * Service layer for copy generation, retrieval, and chat refinement.
 *
 * Coordinates between the Copywriter Agent, Copy Repository, and Strategy
 * Repository, ensuring errors during agent calls never result in
 * incomplete or corrupted database records.
 */

import { randomUUID } from 'crypto';
import {
  CopyRecord,
  CopyOutput,
  ChatResponse,
  StrategyData,
  CopyChatDecision,
  CopyChatMessage,
  CopyItem,
  CopyJob,
  COPIES_PER_PLATFORM,
  newChatMessage,
  newCopyRecord,
} from '../models/copy';
import {
  COPY_PLATFORMS,
  CopyPlatformId,
  OTHER_COPIES_SET,
  defaultCopyPlatforms,
  jobPlatforms,
  normalizePlatform,
} from '../models/copyConstants';
import { StrategyRecord } from '../models/strategy';
import { CopyRepository } from '../db/copyRepository';
import { StrategyRepository } from '../db/strategyRepository';
import { ApiError } from '../errors';
import { closeFeed, laneCopySaved, laneDone, laneWriting, openFeed } from './copyJobFeed';

/** A running job that hasn't saved a copy for this long was interrupted (e.g. the server restarted) */
export const JOB_STALE_AFTER_MS = 3 * 60_000;
/** A full set is abandoned after this long; copies saved by then are kept */
export const JOB_TIMEOUT_MS = 6 * 60_000;
/** Chat messages sent to the model as context */
const CHAT_CONTEXT_MESSAGES = 12;

export interface CopyWorkspace {
  copies: CopyRecord[];
  job: CopyJob | null;
  chat: CopyChatMessage[];
}

export interface CopyChatResult {
  messages: CopyChatMessage[];
  copy?: CopyRecord;
  job?: CopyJob;
}

export interface CopywriterAgentLike {
  generateCopies(strategyData: StrategyData, platforms?: CopyPlatformId[]): Promise<CopyOutput>;
  generatePlatformCopies(
    strategyData: StrategyData,
    platform: CopyPlatformId,
    onCopy?: (copy: CopyItem) => void,
    onWriting?: (partial: { text: string; angle?: string }) => void
  ): Promise<CopyItem[]>;
  chat(
    strategyData: StrategyData,
    history: CopyChatMessage[],
    message: string,
    openCopy?: { text: string; platform: string; hashtags: string[] }
  ): Promise<CopyChatDecision>;
  chatRefine(
    copyText: string,
    platform: string,
    hashtags: string[],
    strategyData: StrategyData,
    userMessage: string
  ): Promise<ChatResponse>;
}

function strategyToAgentData(strategy: StrategyRecord): StrategyData {
  return {
    brand_name: strategy.brand_name,
    industry: strategy.industry,
    target_audience: strategy.target_audience,
    goals: strategy.goals,
    ...strategy.strategy_output,
  };
}

/** Report a running job that stopped updating as failed, e.g. after a server restart */
function withStaleCheck(job: CopyJob): CopyJob {
  if (job.status !== 'running') return job;
  if (Date.now() - new Date(job.updated_at).getTime() < JOB_STALE_AFTER_MS) return job;
  return { ...job, status: 'failed', error: 'Generation was interrupted. Please try again.' };
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

    const output = await this.agent.generateCopies(strategyToAgentData(strategy));

    const records = output.copies.map((item) =>
      newCopyRecord({
        strategy_id: strategyId,
        user_id: userId,
        text: item.text,
        platform: normalizePlatform(item.platform),
        hashtags: item.hashtags,
        angle: item.angle,
      })
    );

    return this.copyRepository.createCopies(records);
  }

  /** Everything the Copywriter page shows for a strategy: its copies, latest job and chat */
  async getWorkspace(strategyId: string, userId: string): Promise<CopyWorkspace> {
    await this.getStrategyWithOwnership(strategyId, userId);
    const [copies, { job, chat }] = await Promise.all([
      this.copyRepository.listCopiesByStrategy(strategyId),
      this.strategyRepository.getCopyWorkspace(strategyId),
    ]);
    return { copies, job: job ? withStaleCheck(job) : null, chat };
  }

  /**
   * Start writing a full set in the background and return straight away.
   * The job runs on the server, so it carries on if the user leaves the page;
   * each copy is saved as soon as it's written. If a job is already running,
   * that one is returned instead.
   */
  async startGeneration(
    strategyId: string,
    userId: string,
    { announce = true, platforms }: { announce?: boolean; platforms?: CopyPlatformId[] } = {}
  ): Promise<CopyJob> {
    const strategy = await this.getStrategyWithOwnership(strategyId, userId);
    const chosen = platforms?.length ? [...new Set(platforms)] : defaultCopyPlatforms(strategy.quiz?.platforms);
    const now = new Date();
    const job: CopyJob = {
      id: randomUUID(),
      status: 'running',
      total: chosen.length * COPIES_PER_PLATFORM,
      // One count per chosen platform; the job's platforms are read back from these keys
      completed: Object.fromEntries(chosen.map((p) => [p, 0])),
      failed_platforms: [],
      started_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    const staleBefore = new Date(now.getTime() - JOB_STALE_AFTER_MS).toISOString();
    const started = await this.strategyRepository.startCopyJob(strategyId, job, staleBefore);
    if (!started) {
      const { job: running } = await this.strategyRepository.getCopyWorkspace(strategyId);
      if (running) return running;
      throw new ApiError('Could not start generating copies. Please try again.', 409);
    }

    if (announce) {
      const labels = chosen.map((p) => COPY_PLATFORMS[p].label);
      const named = labels.length === 1 ? labels[0] : `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
      await this.strategyRepository.appendCopyChat(strategyId, [
        newChatMessage({
          role: 'assistant',
          action: 'generate_all',
          text:
            `Writing ${job.total} copies — ${COPIES_PER_PLATFORM}${labels.length > 1 ? ' each' : ''} for ${named}. ` +
            "They'll appear on the left as each one is done. You can leave this page; they'll be here when you come back.",
        }),
      ]);
    }
    openFeed(job.id, chosen);
    void this.runJob(strategy, userId, job)
      .catch((error) => {
        console.error(`Copy job ${job.id} crashed:`, error);
      })
      .finally(() => closeFeed(job.id));
    return job;
  }

  /** Write every platform's copies in parallel, saving each copy as it arrives */
  private async runJob(strategy: StrategyRecord, userId: string, job: CopyJob): Promise<void> {
    const strategyId = strategy.id;
    const strategyData = strategyToAgentData(strategy);
    const completed = { ...job.completed };
    const failed: string[] = [];
    // Saves run one after another so job progress is written in order
    let saving = Promise.resolve();
    // Copies that arrive after the job has finished (timed out) are dropped
    let finished = false;

    const saveCopy = (platform: CopyPlatformId, item: CopyItem) => {
      if (finished) return;
      saving = saving.then(async () => {
        await this.copyRepository.createCopy(
          newCopyRecord({
            strategy_id: strategyId,
            user_id: userId,
            text: item.text,
            platform,
            hashtags: item.hashtags,
            angle: item.angle,
            job_id: job.id,
          })
        );
        completed[platform] = (completed[platform] ?? 0) + 1;
        laneCopySaved(job.id, platform);
        await this.strategyRepository.updateCopyJob(strategyId, job.id, {
          completed: { ...completed },
          updated_at: new Date().toISOString(),
        });
      });
    };

    const platforms = jobPlatforms(job.completed).map((platform) =>
      this.agent
        .generatePlatformCopies(
          strategyData,
          platform,
          (item) => saveCopy(platform, item),
          (partial) => laneWriting(job.id, platform, partial)
        )
        .catch((error) => {
          console.error(`Copy job ${job.id}: ${platform} failed:`, error);
          failed.push(platform);
        })
        // Wait for its last copies to be saved before marking the lane done
        .then(() => saving.catch(() => {}))
        .finally(() => laneDone(job.id, platform))
    );

    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.all(platforms),
      new Promise<void>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true;
          resolve();
        }, JOB_TIMEOUT_MS);
        // Don't keep the process alive just for this timer
        (timer as { unref?: () => void }).unref?.();
      }),
    ]);
    clearTimeout(timer);
    finished = true;
    await saving.catch((error) => console.error(`Copy job ${job.id}: saving failed:`, error));

    const written = Object.values(completed).reduce((sum, n) => sum + n, 0);
    const failedLabels = failed.map((p) => COPY_PLATFORMS[p as CopyPlatformId].label);
    const status = written > 0 ? 'done' : 'failed';
    const error = timedOut
      ? 'Generation took too long and was stopped.'
      : failed.length
        ? `Couldn't write copies for ${failedLabels.join(', ')}.`
        : undefined;

    const summary =
      status === 'failed'
        ? `I couldn't write the copies this time${error ? ` — ${error.charAt(0).toLowerCase()}${error.slice(1)}` : '.'} Please try again.`
        : `All done — ${written} ${written === 1 ? 'copy is' : 'copies are'} ready on the left.${error ? ` ${error}` : ''}`;
    await this.strategyRepository.appendCopyChat(strategyId, [
      newChatMessage({ role: 'assistant', text: summary, action: status === 'failed' ? 'job_failed' : 'job_done' }),
    ]);
    // Chat first, so a page that stops polling when the job finishes already has the summary
    await this.strategyRepository.updateCopyJob(strategyId, job.id, {
      status,
      failed_platforms: failed,
      ...(error ? { error } : {}),
      updated_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    });
  }

  /**
   * Handle a chat message: the copywriter replies, writes one new copy,
   * rewrites the open copy, or starts a full set. The conversation is saved
   * on the strategy.
   */
  async chat(strategyId: string, userId: string, message: string, copyId?: string): Promise<CopyChatResult> {
    const strategy = await this.getStrategyWithOwnership(strategyId, userId);
    let openCopy: CopyRecord | undefined;
    if (copyId) {
      const [record] = await this.getCopy(copyId, userId);
      if (record && record.strategy_id === strategyId) openCopy = record;
    }

    const userMessage = newChatMessage({ role: 'user', text: message, ...(openCopy ? { copy_id: openCopy.id } : {}) });
    const { chat: history } = await this.strategyRepository.getCopyWorkspace(strategyId);
    // Save the question first, so it's there even if the user leaves before the answer
    await this.strategyRepository.appendCopyChat(strategyId, [userMessage]);

    let decision: CopyChatDecision;
    try {
      decision = await this.agent.chat(
        strategyToAgentData(strategy),
        history.slice(-CHAT_CONTEXT_MESSAGES),
        message,
        openCopy && { text: openCopy.text, platform: COPY_PLATFORMS[openCopy.platform as CopyPlatformId]?.promptName ?? openCopy.platform, hashtags: openCopy.hashtags }
      );
    } catch (error) {
      const failed = newChatMessage({ role: 'assistant', text: "Sorry, I couldn't answer that just now. Please try again." });
      await this.strategyRepository.appendCopyChat(strategyId, [failed]);
      throw error;
    }

    let copy: CopyRecord | undefined;
    let job: CopyJob | undefined;
    let action = decision.action;

    if (action === 'update' && openCopy && decision.copy) {
      copy = await this.copyRepository.updateCopy(openCopy.id, decision.copy.text, decision.copy.hashtags);
    } else if ((action === 'create' || action === 'update') && decision.copy) {
      // An "update" with no open copy becomes a new copy
      action = 'create';
      const platform = normalizePlatform(decision.copy.platform);
      copy = await this.copyRepository.createCopy(
        newCopyRecord({
          strategy_id: strategyId,
          user_id: userId,
          text: decision.copy.text,
          platform: platform in COPY_PLATFORMS ? platform : 'instagram',
          hashtags: decision.copy.hashtags,
          angle: decision.copy.angle || 'From chat',
        })
      );
    } else if (action === 'generate_all') {
      job = await this.startGeneration(strategyId, userId, { announce: false, platforms: decision.platforms });
    } else {
      action = 'reply';
    }

    const assistantMessage = newChatMessage({
      role: 'assistant',
      text: decision.reply,
      action,
      ...(copy ? { copy_id: copy.id } : {}),
    });
    await this.strategyRepository.appendCopyChat(strategyId, [assistantMessage]);
    return { messages: [userMessage, assistantMessage], ...(copy ? { copy } : {}), ...(job ? { job } : {}) };
  }

  /**
   * Delete every copy in a set: a full set's job id, or OTHER_COPIES_SET for
   * copies that aren't part of one. A set still being written can't be deleted.
   * Returns how many copies were deleted.
   */
  async deleteSet(strategyId: string, userId: string, setId: string): Promise<number> {
    await this.getStrategyWithOwnership(strategyId, userId);
    const { job } = await this.strategyRepository.getCopyWorkspace(strategyId);
    if (job?.id === setId && withStaleCheck(job).status === 'running') {
      throw new ApiError('This set is still being written. Delete it once it has finished.', 409);
    }
    const copies = await this.copyRepository.listCopiesByStrategy(strategyId);
    const ids = copies
      .filter((c) => (setId === OTHER_COPIES_SET ? !c.job_id : c.job_id === setId))
      .map((c) => c.id);
    if (ids.length === 0) throw new ApiError('Copy set not found', 404);
    await this.copyRepository.deleteCopies(ids);
    return ids.length;
  }

  /** Save the user's own edits to a copy */
  async updateCopy(copyId: string, userId: string, text: string, hashtags: string[]): Promise<CopyRecord> {
    const [record, belongsToOther] = await this.getCopy(copyId, userId);
    if (belongsToOther) throw new ApiError('Access denied: You do not have permission to access this resource', 403);
    if (record === null) throw new ApiError('Copy not found', 404);
    return this.copyRepository.updateCopy(copyId, text, hashtags);
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
