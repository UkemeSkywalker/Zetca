/**
 * Scores for keyword, tag, title and description suggestions.
 *
 * Every number here comes from real YouTube search results (the top videos
 * for a search, their views, upload dates and tags) or from simple checks of
 * the text. The AI never produces a score.
 */

export interface TopVideo {
  id: string;
  title: string;
  views: number;
  publishedAt: string;
  tags: string[];
  channelTitle: string;
}

export interface KeywordInsight {
  phrase: string;
  /** 0–100: demand, freshness and room to compete combined */
  score: number;
  /** Median views of the top results for this search */
  medianViews: number;
  /** Top results uploaded in the last 6 months */
  recentCount: number;
  /** Top results whose title already targets this phrase and have 50K+ views */
  strongCompetitors: number;
  /** How many top results were looked at */
  sampleSize: number;
}

export interface TagInsight {
  tag: string;
  score: number;
  /** How many of the top videos use this tag */
  usedBy: number;
  sampleSize: number;
  /** Median views of the videos that use it */
  medianViews: number;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Views on a log scale: 1K → 46, 100K → 77, 3M → 100 */
export function demandScore(medianViews: number): number {
  return clamp((Math.log10(medianViews + 1) / 6.5) * 100);
}

const SIX_MONTHS_MS = 182 * 24 * 60 * 60 * 1000;

/** A search phrase scored from its top results */
export function scoreKeyword(phrase: string, results: TopVideo[], now = new Date()): KeywordInsight {
  const sampleSize = results.length;
  const medianViews = median(results.map((v) => v.views));
  const recentCount = results.filter((v) => now.getTime() - new Date(v.publishedAt).getTime() < SIX_MONTHS_MS).length;
  const target = normalize(phrase);
  const strongCompetitors = results.filter((v) => v.views >= 50_000 && normalize(v.title).includes(target)).length;
  const freshness = sampleSize ? (recentCount / sampleSize) * 100 : 0;
  const competition = sampleSize ? (strongCompetitors / sampleSize) * 100 : 100;
  const score = sampleSize ? clamp(0.55 * demandScore(medianViews) + 0.25 * freshness + 0.2 * (100 - competition)) : 0;
  return { phrase, score, medianViews, recentCount, strongCompetitors, sampleSize };
}

/** Tags the top videos actually use, scored by how many use them and how those videos do */
export function scoreTags(results: TopVideo[], limit = 20): TagInsight[] {
  const unique = new Map<string, TopVideo>();
  for (const v of results) unique.set(v.id, v);
  const videos = [...unique.values()];
  const byTag = new Map<string, { tag: string; views: number[] }>();
  for (const v of videos) {
    const seen = new Set<string>();
    for (const raw of v.tags) {
      const key = normalize(raw);
      if (!key || key.length > 60 || seen.has(key)) continue;
      seen.add(key);
      const entry = byTag.get(key) ?? { tag: raw.trim().toLowerCase(), views: [] };
      entry.views.push(v.views);
      byTag.set(key, entry);
    }
  }
  const sampleSize = videos.length;
  return [...byTag.values()]
    .filter((e) => e.views.length >= 2) // used by one video only is noise
    .map((e) => {
      const medianViews = median(e.views);
      const share = (e.views.length / sampleSize) * 100;
      return {
        tag: e.tag,
        usedBy: e.views.length,
        sampleSize,
        medianViews,
        score: clamp(0.5 * Math.min(100, share * 2) + 0.5 * demandScore(medianViews)),
      };
    })
    .sort((a, b) => b.score - a.score || b.usedBy - a.usedBy)
    .slice(0, limit);
}

/** One line of a checklist behind a score */
export interface Check {
  ok: boolean;
  label: string;
}

/** A title scored by simple checks against the researched keywords */
export function scoreTitle(title: string, keywords: KeywordInsight[]): { score: number; checks: Check[] } {
  const text = normalize(title);
  const ranked = [...keywords].sort((a, b) => b.score - a.score);
  const main = ranked[0];
  const found = ranked.filter((k) => text.includes(normalize(k.phrase)));
  const early = found.find((k) => normalize(title.slice(0, 45)).includes(normalize(k.phrase)));
  const length = title.trim().length;
  const shouty = /\b[A-Z]{4,}\b/.test(title) || (title.match(/!/g) ?? []).length > 1;

  const checks: Check[] = [
    { ok: !!main && found.includes(main), label: main ? `Uses the top search “${main.phrase}”` : 'Uses a researched search' },
    { ok: !!early, label: 'A search phrase in the first 45 characters' },
    { ok: length >= 30 && length <= 70, label: `${length} characters (30–70 shows in full)` },
    { ok: !shouty, label: 'No ALL-CAPS words or repeated “!”' },
  ];
  const best = found[0]?.score ?? 0;
  const score = clamp(
    (checks[0].ok ? 35 : found.length ? 20 : 0) +
      (checks[1].ok ? 15 : 0) +
      (checks[2].ok ? 20 : length > 0 && length <= 100 ? 10 : 0) +
      (checks[3].ok ? 10 : 0) +
      0.2 * best
  );
  return { score, checks };
}

/** A description scored by simple checks against the researched keywords */
export function scoreDescription(
  description: string,
  keywords: KeywordInsight[],
  chaptersOk: boolean | null
): { score: number; checks: Check[] } {
  const text = normalize(description);
  const ranked = [...keywords].sort((a, b) => b.score - a.score);
  const main = ranked[0];
  const opening = normalize(description.slice(0, 150));
  const used = ranked.filter((k) => text.includes(normalize(k.phrase)));
  const checks: Check[] = [
    { ok: !!main && opening.includes(normalize(main.phrase)), label: main ? `“${main.phrase}” in the first 150 characters` : 'Top search in the opening' },
    { ok: used.length >= 2, label: `${used.length} researched searches used (2+)` },
    { ok: description.trim().length >= 250, label: 'At least 250 characters' },
  ];
  if (chaptersOk !== null) checks.push({ ok: chaptersOk, label: 'Chapters YouTube will show' });
  const weights = chaptersOk === null ? [40, 30, 30] : [35, 25, 25, 15];
  const score = clamp(checks.reduce((sum, c, i) => sum + (c.ok ? weights[i] : 0), 0));
  return { score, checks };
}

/** "1234567" → "1.2M" */
export function compactNumber(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Whether every word of `phrase` appears in `source` (so a phrase can't be invented) */
export function groundedIn(phrase: string, source: string): boolean {
  const words = normalize(phrase).split(' ').filter(Boolean);
  const haystack = new Set(normalize(source).split(' '));
  return words.length > 0 && words.every((w) => haystack.has(w));
}
