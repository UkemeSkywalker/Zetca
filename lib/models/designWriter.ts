/**
 * "Describe a post, we'll design it": the words for a design, written from a prompt
 */

import { z } from 'zod';

export const DESIGN_STYLE_IDS = ['bold-statement', 'quote-card', 'countdown', 'announcement', 'headline-body', 'glow'] as const;

export const DesignWriterRequestSchema = z.object({
  prompt: z.string().trim().min(3, 'Say a few words about the post').max(1000),
  /** A style the user already picked; otherwise the writer picks one */
  styleId: z.enum(DESIGN_STYLE_IDS).optional(),
});
export type DesignWriterRequest = z.infer<typeof DesignWriterRequestSchema>;

export const DesignWriterResponseSchema = z.object({
  styleId: z.enum(DESIGN_STYLE_IDS).describe(
    'bold-statement: one punchy line; quote-card: a quote or saying; countdown: "Day X of Y" or a numbered series; announcement: launches, drops, events; headline-body: a tip with a short explanation; glow: a calm statement or mindset line'
  ),
  headline: z
    .string()
    .describe('The big words on the design: 2-7 words, on 2-3 short lines (a real line break between lines). No hashtags, emojis or quotation marks.'),
  kicker: z.string().optional().describe('A tiny label above the headline, 1-3 words (e.g. "Daily reminder"), or omit'),
  body: z.string().optional().describe('Only for headline-body: one supporting sentence of at most 18 words'),
  photoQuery: z
    .string()
    .describe('1-3 plain English words to search free stock photos for a background that fits the post (e.g. "gym workout", "coffee shop"). No brand names.'),
});
export type DesignWriterResponse = z.infer<typeof DesignWriterResponseSchema>;

/** Trims what the writer returned to sizes that fit on a design */
export function cleanDesignText(r: DesignWriterResponse): DesignWriterResponse {
  const tidy = (s: string | undefined, max: number) =>
    s
      ?.replace(/\\n/g, '\n')
      .replace(/[“”"#]/g, '')
      .replace(/[ \t]+/g, ' ')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n')
      .slice(0, max)
      .trim() || undefined;
  return {
    styleId: r.styleId,
    headline: tidy(r.headline, 80) ?? 'Your words here',
    kicker: tidy(r.kicker, 30),
    body: r.styleId === 'headline-body' ? tidy(r.body, 160) : undefined,
    photoQuery: (r.photoQuery ?? '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' '),
  };
}
