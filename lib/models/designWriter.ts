/**
 * "Describe a post, we'll design it": the words for a design, written from a prompt
 */

import { z } from 'zod';

export const DESIGN_STYLE_IDS = ['bold-statement', 'quote-card', 'countdown', 'announcement', 'headline-body', 'glow'] as const;

export const DesignWriterRequestSchema = z.object({
  prompt: z.string().trim().min(3, 'Say a few words about the post').max(1000),
  /** A style the user already picked; otherwise the writer picks one */
  styleId: z.enum(DESIGN_STYLE_IDS).optional(),
  /** A carousel: how many content slides to write between the cover and the closing slide */
  slides: z.number().int().min(1).max(8).optional(),
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
  imagePrompt: z
    .string()
    .describe('One sentence describing a striking photo for an AI image generator to make for this post: subject, setting, light, mood. No words or text in the image, no brand names, no real people by name.'),
  people: z
    .string()
    .optional()
    .describe(
      'Who should appear in the picture, as a kind of person (not a count): age, gender, ethnicity, look, chosen to match the brand’s customers and the post. E.g. "Black women in their late 20s with natural hair". Use the brand’s audience when it is given. Omit only if the post has no people in it.'
    ),
  object: z
    .string()
    .optional()
    .describe('The product or object the picture should show, from the brand and the post, e.g. "a jar of whipped shea butter". Plain, with no brand names. Omit if nothing specific fits.'),
  slides: z
    .array(
      z.object({
        headline: z.string().describe('One point, 2-7 words'),
        body: z.string().optional().describe('One or two short sentences that explain it, at most 24 words'),
      })
    )
    .optional()
    .describe('Only for a carousel: exactly the number of content slides asked for, each one clear point that builds on the last'),
  closing: z.string().optional().describe('Only for a carousel: the last slide’s line, 3-8 words, that sums it up or invites action'),
  cta: z.string().optional().describe('Only for a carousel: a button of 2-4 words for the last slide, e.g. "Book a call" or "Follow for more"'),
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
    imagePrompt: (r.imagePrompt ?? '').replace(/\s+/g, ' ').trim().slice(0, 600),
    ...(r.slides?.length
      ? {
          slides: r.slides.slice(0, 8).map((sl) => ({ headline: tidy(sl.headline, 70) ?? '', body: tidy(sl.body, 200)?.replace(/\n/g, ' ') })).filter((sl) => sl.headline),
          closing: tidy(r.closing, 70),
          cta: tidy(r.cta, 30)?.replace(/\n/g, ' '),
        }
      : {}),
    people: tidy(r.people, 140)?.replace(/\n/g, ' '),
    object: tidy(r.object, 120)?.replace(/\n/g, ' '),
    photoQuery: (r.photoQuery ?? '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' '),
  };
}
