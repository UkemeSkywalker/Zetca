/**
 * Rule-based keyword suggestions for the Strategist quiz.
 *
 * Used as the mock keyword agent's output and as an instant fallback on the
 * client while (or if) the AI suggestions are unavailable.
 */

import { findNiche } from './niches';

export type SkillLevel = 'beginner' | 'intermediate' | 'pro';

export interface KeywordContext {
  niches: string[];
  topics: { niche: string; topic: string }[];
  skill: SkillLevel | null;
}

export const MAX_KEYWORD_CHIPS = 8;

export function ruleBasedKeywords({ niches, topics, skill }: KeywordContext): string[] {
  const forSkill = (phrase: string) =>
    skill === 'beginner' ? `${phrase} for beginners` : skill === 'pro' ? `advanced ${phrase}` : `${phrase} tips`;
  const result: string[] = [];
  const add = (k: string) => {
    const clean = k.toLowerCase();
    if (!result.includes(clean)) result.push(clean);
  };
  topics.forEach((t) => add(forSkill(t.topic)));
  niches.forEach((n) => {
    if (!topics.some((t) => t.niche === n)) add(forSkill(n));
  });
  topics.forEach((t) => add(t.topic));
  const extras = niches.map((n) => findNiche(n)?.keywords ?? []);
  for (let i = 0; i < 6; i++) extras.forEach((list) => list[i] && add(list[i]));
  return result.slice(0, MAX_KEYWORD_CHIPS);
}

/** Normalise model output: lowercase, trimmed, deduped, capped */
export function cleanKeywords(keywords: string[]): string[] {
  const result: string[] = [];
  for (const k of keywords) {
    const clean = k.trim().toLowerCase().replace(/^#/, '').replace(/\s+/g, ' ');
    if (clean && clean.length <= 60 && !result.includes(clean)) result.push(clean);
  }
  return result.slice(0, MAX_KEYWORD_CHIPS);
}
