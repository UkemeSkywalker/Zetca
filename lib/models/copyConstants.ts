/**
 * Copywriter platform names and limits, safe to import from client components
 * (lib/models/copy.ts pulls in Node's crypto).
 */

export const COPY_PLATFORMS = {
  x: { label: 'X', promptName: 'Twitter/X', limit: 280 },
  instagram: { label: 'Instagram', promptName: 'Instagram', limit: 2200 },
  tiktok: { label: 'TikTok', promptName: 'TikTok', limit: 2200 },
  linkedin: { label: 'LinkedIn', promptName: 'LinkedIn', limit: 3000 },
  facebook: { label: 'Facebook', promptName: 'Facebook', limit: 63206 },
  youtube: { label: 'YouTube', promptName: 'YouTube video description', limit: 5000 },
} as const;

export type CopyPlatformId = keyof typeof COPY_PLATFORMS;

export const COPY_PLATFORM_IDS = Object.keys(COPY_PLATFORMS) as CopyPlatformId[];

/** Map the many ways a platform gets written ("Twitter/X", "X (Twitter)") to its id */
export function normalizePlatform(p: string): string {
  const lower = p.toLowerCase().trim();
  if (['twitter', 'twitter/x', 'x (twitter)', 'x/twitter'].includes(lower)) return 'x';
  if (lower.startsWith('youtube')) return 'youtube';
  return lower;
}

/** The platforms a set is written for when none are picked */
export const CLASSIC_COPY_PLATFORMS: CopyPlatformId[] = ['x', 'instagram', 'linkedin', 'facebook'];

/** Default platforms for a strategy: the ones chosen in its quiz, else the classic four */
export function defaultCopyPlatforms(quizPlatforms?: readonly string[]): CopyPlatformId[] {
  const chosen = COPY_PLATFORM_IDS.filter((p) => quizPlatforms?.includes(p));
  return chosen.length ? chosen : CLASSIC_COPY_PLATFORMS;
}

/** A job's platforms, in order (its per-platform counts are created for exactly these) */
export function jobPlatforms(completed: Record<string, number>): CopyPlatformId[] {
  return Object.keys(completed).filter((p): p is CopyPlatformId => p in COPY_PLATFORMS);
}

/** Set id for copies that aren't part of a full set (written in the chat, or before sets existed) */
export const OTHER_COPIES_SET = 'other';
