/**
 * Zod schemas and types for copy data validation and serialization.
 *
 * Field names are snake_case to match the wire format consumed by
 * lib/api/copyClient.ts.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { StrategyOutput } from './strategy';

export const CopyGenerateInputSchema = z.object({
  strategy_id: z.string().trim().min(1, 'strategy_id cannot be empty or whitespace only'),
});
export type CopyGenerateInput = z.infer<typeof CopyGenerateInputSchema>;

/** The brand and strategy fields the copywriter writes from */
export type StrategyData = Partial<
  { brand_name: string; industry: string; target_audience: string; goals: string } & StrategyOutput
>;

export const CopyItemSchema = z.object({
  text: z.string().describe('The post caption text'),
  platform: z.string().describe('Target social media platform'),
  hashtags: z.array(z.string()).default([]).describe('List of relevant hashtags'),
  angle: z.string().optional().describe('Short name of the angle this copy takes, e.g. "Bold hook"'),
});
export type CopyItem = z.infer<typeof CopyItemSchema>;

export const CopyOutputSchema = z.object({
  copies: z.array(CopyItemSchema).min(1).describe('List of generated copies, 7 variations per platform'),
});
export type CopyOutput = z.infer<typeof CopyOutputSchema>;

export interface CopyRecord {
  id: string;
  strategy_id: string;
  user_id: string;
  text: string;
  platform: string;
  hashtags: string[];
  /** Short name of the copy's angle, e.g. "Bold hook" */
  angle?: string;
  /** The background generation job that wrote this copy, if any */
  job_id?: string;
  created_at: string;
  updated_at: string;
}

export function newCopyRecord(data: {
  strategy_id: string;
  user_id: string;
  text: string;
  platform: string;
  hashtags: string[];
  angle?: string;
  job_id?: string;
}): CopyRecord {
  const now = new Date().toISOString();
  return { id: randomUUID(), created_at: now, updated_at: now, ...data };
}

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1, 'message cannot be empty or whitespace only'),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const ChatResponseSchema = z.object({
  updated_text: z.string().describe('Updated copy text'),
  updated_hashtags: z.array(z.string()).default([]).describe('Updated hashtags'),
  ai_message: z.string().describe('AI explanation of changes made'),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const CopyUpdateSchema = z.object({
  text: z.string().trim().min(1, 'text cannot be empty or whitespace only').max(5000),
  hashtags: z.array(z.string().trim().min(1)).max(30).default([]),
});
export type CopyUpdate = z.infer<typeof CopyUpdateSchema>;

// ---------------------------------------------------------------------------
// Background generation jobs
// ---------------------------------------------------------------------------

/** Copies written per platform in a full set (platforms: COPY_PLATFORM_IDS) */
export const COPIES_PER_PLATFORM = 7;

export type CopyJobStatus = 'running' | 'done' | 'failed';

/** A full-set generation, stored on the strategy so it survives the user leaving the page */
export interface CopyJob {
  id: string;
  status: CopyJobStatus;
  total: number;
  /** Copies saved so far, per platform */
  completed: Record<string, number>;
  /** Platforms whose generation failed */
  failed_platforms: string[];
  error?: string;
  started_at: string;
  /** Bumped on every saved copy; a running job that stops updating was interrupted */
  updated_at: string;
  finished_at?: string;
}

export const CopyJobStartSchema = z.object({
  strategy_id: z.string().trim().min(1, 'strategy_id cannot be empty or whitespace only'),
});

// ---------------------------------------------------------------------------
// Copywriter chat, saved per strategy
// ---------------------------------------------------------------------------

export interface CopyChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** The copy this message created, changed or was about */
  copy_id?: string;
  /** What the assistant did */
  action?: 'reply' | 'create' | 'update' | 'generate_all' | 'job_done' | 'job_failed';
  created_at: string;
}

export function newChatMessage(data: Omit<CopyChatMessage, 'id' | 'created_at'>): CopyChatMessage {
  return { id: randomUUID(), created_at: new Date().toISOString(), ...data };
}

export const CopyChatRequestSchema = z.object({
  strategy_id: z.string().trim().min(1, 'strategy_id cannot be empty or whitespace only'),
  message: z.string().trim().min(1, 'message cannot be empty or whitespace only').max(2000),
  /** The copy the user has open, if any; requests like "make it punchier" apply to it */
  copy_id: z.string().trim().min(1).optional(),
});
export type CopyChatRequest = z.infer<typeof CopyChatRequestSchema>;

/** What the copywriter decides to do with a chat message */
export const CopyChatDecisionSchema = z.object({
  reply: z.string().describe('Short, friendly reply to show in the chat (1-3 sentences). Do not repeat the copy text here.'),
  action: z
    .enum(['reply', 'create', 'update', 'generate_all'])
    .describe(
      'reply: just answer. create: write one new copy. update: rewrite the open copy. ' +
        'generate_all: the user wants a full set of copies for every platform.'
    ),
  copy: CopyItemSchema.optional().describe('The new or rewritten copy; required for create and update'),
});
export type CopyChatDecision = z.infer<typeof CopyChatDecisionSchema>;

export const RefineTextRequestSchema = z.object({
  text: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  platform: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  message: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  hashtags: z.array(z.string()).default([]),
});
export type RefineTextRequest = z.infer<typeof RefineTextRequestSchema>;
