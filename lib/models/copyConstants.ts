/**
 * Copywriter platform names and limits, safe to import from client components
 * (lib/models/copy.ts pulls in Node's crypto).
 */

export const COPY_PLATFORMS = {
  x: { label: 'X', promptName: 'Twitter/X', limit: 280 },
  instagram: { label: 'Instagram', promptName: 'Instagram', limit: 2200 },
  linkedin: { label: 'LinkedIn', promptName: 'LinkedIn', limit: 3000 },
  facebook: { label: 'Facebook', promptName: 'Facebook', limit: 63206 },
} as const;

export type CopyPlatformId = keyof typeof COPY_PLATFORMS;

export const COPY_PLATFORM_IDS = Object.keys(COPY_PLATFORMS) as CopyPlatformId[];

/** Map the many ways a platform gets written ("Twitter/X", "X (Twitter)") to its id */
export function normalizePlatform(p: string): string {
  const lower = p.toLowerCase().trim();
  if (['twitter', 'twitter/x', 'x (twitter)', 'x/twitter', 'tiktok'].includes(lower)) return 'x';
  return lower;
}

/** Set id for copies that aren't part of a full set (written in the chat, or before sets existed) */
export const OTHER_COPIES_SET = 'other';
