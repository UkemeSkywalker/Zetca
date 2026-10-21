/**
 * Structured AI output for video suggestions. The AI picks search phrases
 * from what's said in the video, and writes titles and a description using
 * researched keywords; scores are computed separately from YouTube data.
 */

import { z } from 'zod';

export const TopicsSchema = z.object({
  phrases: z
    .array(z.string())
    .max(8)
    .describe('2-5 word search phrases a viewer would type to find this video, using only words from the title or transcript'),
});

export const WrittenSuggestionsSchema = z.object({
  titles: z.array(z.string()).min(3).max(6).describe('Title ideas, each using at least one of the given search phrases, 30-70 characters'),
  description: z
    .string()
    .describe('Description: open with the top search phrase in the first sentence, then 2-3 short paragraphs about what is actually in the video, then a call to action. Plain text.'),
});
export type WrittenSuggestions = z.infer<typeof WrittenSuggestionsSchema>;

export const ResearchRequestSchema = z.object({
  title: z.string().max(200).default(''),
  mediaId: z.string().uuid().optional(),
  region: z.string().regex(/^[A-Z]{2}$/).default('US'),
  language: z.string().max(20).default('en'),
  isShort: z.boolean().default(false),
});
export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
