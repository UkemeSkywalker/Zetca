/**
 * Chapters suggested from a video's transcript. The AI only picks which
 * transcript sentences start a chapter and names them; the times come from
 * the transcript, so they can't be made up.
 */

import { z } from 'zod';
import type { Transcript } from '@/types/media';

export const ChapterPicksSchema = z.object({
  chapters: z
    .array(
      z.object({
        segment: z.number().int().describe('Index of the transcript sentence where this chapter starts'),
        title: z.string().describe('Short chapter title, 2-6 words, using the words spoken in that part'),
      })
    )
    .describe('Chapters in time order. The first must start at segment 0.'),
});
export type ChapterPicks = z.infer<typeof ChapterPicksSchema>;

export interface Chapter {
  seconds: number;
  title: string;
}

/** Applies YouTube's chapter rules to the AI's picks: starts at 0:00, at least 3, each 10+ seconds */
export function chaptersFromPicks(picks: ChapterPicks, transcript: Transcript, durationSeconds?: number): Chapter[] {
  const segments = transcript.segments;
  const seen = new Set<number>();
  const chapters: Chapter[] = [];
  for (const pick of [...picks.chapters].sort((a, b) => a.segment - b.segment)) {
    const segment = segments[pick.segment];
    if (!segment || seen.has(pick.segment)) continue;
    seen.add(pick.segment);
    const title = pick.title.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!title) continue;
    const seconds = chapters.length === 0 ? 0 : Math.floor(segment.start);
    const previous = chapters[chapters.length - 1];
    if (previous && seconds - previous.seconds < 10) continue;
    if (durationSeconds && seconds > durationSeconds - 10) continue;
    chapters.push({ seconds, title });
  }
  return chapters.length >= 3 ? chapters : [];
}

/** The transcript as numbered lines for the AI: "[12] 3:05 Now we move to squats…" */
export function numberedTranscript(transcript: Transcript, maxChars = 120_000): string {
  const lines = transcript.segments.map((s, i) => {
    const m = Math.floor(s.start / 60);
    const sec = String(Math.floor(s.start % 60)).padStart(2, '0');
    return `[${i}] ${m}:${sec} ${s.text}`;
  });
  let out = lines.join('\n');
  if (out.length > maxChars) out = out.slice(0, maxChars);
  return out;
}
