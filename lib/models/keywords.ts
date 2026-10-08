/**
 * Keyword suggestion models.
 *
 * Wire format (snake_case) for POST /api/strategy/keywords, which suggests
 * search keywords for the Strategist quiz from the answers given so far.
 */

import { z } from 'zod';

export const SKILL_LEVELS = ['beginner', 'intermediate', 'pro'] as const;

export const KeywordRequestSchema = z.object({
  niches: z.array(z.string().trim().min(1).max(40)).min(1).max(3),
  topics: z
    .array(z.object({ niche: z.string().trim().min(1).max(40), topic: z.string().trim().min(1).max(40) }))
    .max(9)
    .default([]),
  skill_level: z.enum(SKILL_LEVELS).nullable().default(null),
  age_ranges: z.array(z.string().max(10)).max(5).default([]),
  interests: z.array(z.string().trim().max(40)).max(20).default([]),
  struggles: z.array(z.string().trim().max(40)).max(20).default([]),
  platforms: z.array(z.string().max(20)).max(6).default([]),
  content_types: z.array(z.string().max(30)).max(8).default([]),
});
export type KeywordRequest = z.infer<typeof KeywordRequestSchema>;

export const KeywordResponseSchema = z.object({
  keywords: z
    .array(z.string())
    .min(4)
    .max(10)
    .describe(
      'Search phrases people actually type, lowercase, 2-6 words, most relevant first. ' +
        'The first item is the best main keyword for the channel.'
    ),
});
export type KeywordResponse = z.infer<typeof KeywordResponseSchema>;
