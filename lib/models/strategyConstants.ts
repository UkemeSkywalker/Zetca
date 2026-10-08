/**
 * Strategy constants shared by the server models and the browser.
 * Kept free of server-only imports so client components can use them.
 */

export const PLATFORM_IDS = ['youtube', 'instagram', 'tiktok', 'linkedin', 'x', 'facebook'] as const;
export type PlatformId = (typeof PLATFORM_IDS)[number];

/** Character limit of each platform's channel description / bio */
export const DESCRIPTION_LIMITS: Record<PlatformId, number> = {
  youtube: 1000,
  instagram: 150,
  tiktok: 80,
  linkedin: 2600,
  x: 160,
  facebook: 255,
};

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
