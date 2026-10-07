/**
 * Zod schemas and types for copy data validation and serialization.
 *
 * Field names are snake_case to match the wire format consumed by
 * lib/api/copyClient.ts.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

export const CopyGenerateInputSchema = z.object({
  strategy_id: z.string().trim().min(1, 'strategy_id cannot be empty or whitespace only'),
});
export type CopyGenerateInput = z.infer<typeof CopyGenerateInputSchema>;

export const CopyItemSchema = z.object({
  text: z.string().describe('The post caption text'),
  platform: z.string().describe('Target social media platform'),
  hashtags: z.array(z.string()).default([]).describe('List of relevant hashtags'),
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
  created_at: string;
  updated_at: string;
}

export function newCopyRecord(data: {
  strategy_id: string;
  user_id: string;
  text: string;
  platform: string;
  hashtags: string[];
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

export const RefineTextRequestSchema = z.object({
  text: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  platform: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  message: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  hashtags: z.array(z.string()).default([]),
});
export type RefineTextRequest = z.infer<typeof RefineTextRequestSchema>;
