/**
 * Rule-based keyword suggestions for the Strategist quiz.
 *
 * Used as the mock keyword agent's output and as an instant fallback on the
 * client while (or if) the AI suggestions are unavailable.
 */

export type SkillLevel = 'beginner' | 'intermediate' | 'pro';

export interface KeywordContext {
  niches: string[];
  topics: { niche: string; topic: string }[];
  skill: SkillLevel | null;
}

export const MAX_KEYWORD_CHIPS = 8;

// Common search phrases per niche, used to fill out the keyword list
const NICHE_KEYWORDS: Record<string, string[]> = {
  Fitness: ['no equipment workout', '15 minute workout', 'beginner fitness', 'full body workout', 'workout at home', 'fat burning workout'],
  Tech: ['tech tips', 'best budget phone', 'ai tools for productivity', 'unboxing and review', 'tech for beginners'],
  Finance: ['how to invest', 'money saving tips', 'budgeting for beginners', 'passive income ideas', 'personal finance tips'],
  Cooking: ['easy recipes', 'quick dinner ideas', 'healthy meal prep', 'cooking for beginners', 'budget meals'],
  Gaming: ['gameplay walkthrough', 'best games 2026', 'gaming tips', 'pro tips and tricks', 'game review'],
  Education: ['study tips', 'how to learn faster', 'exam preparation', 'study with me', 'learning hacks'],
  Travel: ['travel tips', 'budget travel guide', 'things to do in', 'travel vlog', 'packing tips'],
  Beauty: ['skincare routine', 'makeup tutorial', 'drugstore dupes', 'beauty tips', 'everyday makeup'],
};

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
  const extras = niches.map((n) => NICHE_KEYWORDS[n] ?? []);
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
