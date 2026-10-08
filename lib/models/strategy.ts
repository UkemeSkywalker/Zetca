/**
 * Zod schemas and types for strategy data validation and serialization.
 *
 * Field names are intentionally snake_case: these shapes are the wire
 * format consumed by lib/api/strategyClient.ts (request bodies sent and
 * JSON responses parsed), matching the API contract the Python service
 * used to serve. Keeping snake_case here avoids a translation layer.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

import { PLATFORM_IDS, WEEKDAYS } from './strategyConstants';

export { PLATFORM_IDS, DESCRIPTION_LIMITS, WEEKDAYS } from './strategyConstants';
export type { PlatformId } from './strategyConstants';

/** The structured answers from the Strategist quiz */
export const QuizAnswersSchema = z.object({
  platforms: z.array(z.enum(PLATFORM_IDS)).min(1).max(6),
  niches: z
    .array(z.object({ label: z.string().trim().min(1).max(40), emoji: z.string().max(8) }))
    .min(1)
    .max(3),
  topics: z
    .array(z.object({ niche: z.string().trim().min(1).max(40), topic: z.string().trim().min(1).max(40) }))
    .max(9)
    .default([]),
  age_ranges: z.array(z.string().max(10)).max(5).default([]),
  skill_level: z.enum(['beginner', 'intermediate', 'pro']).nullable().default(null),
  interests: z.array(z.string().trim().max(40)).max(20).default([]),
  struggles: z.array(z.string().trim().max(40)).max(20).default([]),
  content_types: z.array(z.string().max(30)).max(8).default([]),
  cadence: z.number().int().min(1).max(14),
  primary_keyword: z.string().trim().min(1).max(60),
  secondary_keywords: z.array(z.string().trim().min(1).max(60)).max(3).default([]),
  goal: z.enum(['grow', 'authority', 'sell', 'community']),
});
export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;

export const StrategyInputSchema = z.object({
  brand_name: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  industry: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  target_audience: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  goals: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  /** Present when the strategy comes from the quiz; enables channel descriptions */
  quiz: QuizAnswersSchema.optional(),
});
export type StrategyInput = z.infer<typeof StrategyInputSchema>;

/** A channel description in the 5-part formula, one per platform */
export const ChannelDescriptionSchema = z.object({
  platform: z.enum(PLATFORM_IDS),
  hook: z
    .string()
    .describe('Part 1: the first sentence. Contains the primary keyword naturally within its first 100 characters and says exactly what the channel is about.'),
  audience: z
    .string()
    .describe('Part 2: names the target audience (e.g. "Whether you\'re a beginner or…") and naturally includes a secondary keyword.'),
  content: z
    .string()
    .describe('Part 3: 2-3 sentences describing the content, weaving in the remaining keywords using real search phrasing. Never keyword-stuffed.'),
  value: z
    .string()
    .describe('Part 4: one sentence on the unique value, optionally hinting at upload consistency (e.g. "New videos every week").'),
  cta: z.string().describe('Part 5: a clear, motivating subscribe/follow prompt tailored to the niche.'),
});
export type ChannelDescription = z.infer<typeof ChannelDescriptionSchema>;

export const ScheduleSchema = z.object({
  days: z.array(z.enum(WEEKDAYS)).min(1).max(7).describe('Days of the week to post on'),
  best_time: z.string().describe('Best posting time window, e.g. "7:00 AM – 9:00 AM"'),
  focus: z.string().describe('A short note on the schedule\'s focus, e.g. "High-energy morning start"'),
});
export type Schedule = z.infer<typeof ScheduleSchema>;

export const PlatformRecommendationSchema = z.object({
  platform: z.string().describe('Platform name (e.g., Instagram, LinkedIn, Twitter)'),
  rationale: z.string().describe('Why this platform is recommended for the brand, in one sentence of at most 20 words'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level for this platform'),
});
export type PlatformRecommendation = z.infer<typeof PlatformRecommendationSchema>;

// Upper limits keep the output short: generation time grows with every token the model writes
export const StrategyOutputSchema = z.object({
  content_pillars: z
    .array(z.string())
    .min(3)
    .max(5)
    .describe('3-5 core content themes that align with brand identity and resonate with the target audience; each a short label of 2-4 words'),
  posting_schedule: z
    .string()
    .describe('Recommended posting frequency and optimal timing for maximum engagement, in one or two sentences'),
  platform_recommendations: z
    .array(PlatformRecommendationSchema)
    .min(2)
    .max(6)
    .describe('Recommended social media platforms with rationale and priority'),
  content_themes: z
    .array(z.string())
    .min(5)
    .max(8)
    .describe('5-8 specific content ideas and topics aligned with content pillars; each at most 15 words'),
  engagement_tactics: z
    .array(z.string())
    .min(4)
    .max(6)
    .describe('4-6 strategies for audience interaction and community building; each one sentence of at most 25 words'),
  visual_prompts: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe(
      '2-3 image generation prompts that align with content themes and engagement tactics, designed to be passed to a Designer Agent for creating graphics; each at most 50 words'
    ),
  /** Only on strategies generated from the quiz */
  channel_descriptions: z.array(ChannelDescriptionSchema).optional(),
  /** Only on strategies generated from the quiz */
  schedule: ScheduleSchema.optional(),
});
export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

/** What the quiz strategist must return: the base strategy plus descriptions and schedule */
export const QuizStrategyOutputSchema = StrategyOutputSchema.extend({
  channel_descriptions: z
    .array(ChannelDescriptionSchema)
    .min(1)
    .describe('One channel description per requested platform, in the 5-part formula, within that platform\'s character limit'),
  schedule: ScheduleSchema,
});

export interface StrategyRecord {
  id: string;
  user_id: string;
  brand_name: string;
  industry: string;
  target_audience: string;
  goals: string;
  strategy_output: StrategyOutput;
  quiz?: QuizAnswers;
  created_at: string;
}

export function newStrategyRecord(
  input: StrategyInput,
  userId: string,
  output: StrategyOutput
): StrategyRecord {
  return {
    id: randomUUID(),
    user_id: userId,
    brand_name: input.brand_name,
    industry: input.industry,
    target_audience: input.target_audience,
    goals: input.goals,
    strategy_output: output,
    ...(input.quiz ? { quiz: input.quiz } : {}),
    created_at: new Date().toISOString(),
  };
}
