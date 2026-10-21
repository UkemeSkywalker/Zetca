/**
 * "Write with Copywriter" on the YouTube video page: drafts a title,
 * description and tags from what the creator says the video is about.
 */

import { z } from 'zod';

export const VideoWriterRequestSchema = z.object({
  brief: z.string().trim().min(3, 'Say a few words about the video').max(2000),
  filename: z.string().max(200).optional(),
  durationSeconds: z.number().positive().max(86_400).optional(),
  isShort: z.boolean().default(false),
  language: z.string().max(20).optional(),
});
export type VideoWriterRequest = z.infer<typeof VideoWriterRequestSchema>;

export const VideoWriterResponseSchema = z.object({
  title: z.string().describe('Video title, at most 90 characters, no < or >'),
  description: z
    .string()
    .describe('Video description: a hook in the first 150 characters, then 2-4 short paragraphs, then a call to action. No < or >.'),
  tags: z.array(z.string()).min(3).max(15).describe('Search tags, lowercase, 1-4 words each, no hashtags or commas'),
});
export type VideoWriterResponse = z.infer<typeof VideoWriterResponseSchema>;
