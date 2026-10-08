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

/**
 * Stages of a streamed strategy generation, in order: waiting for the model, the
 * strategy body, the channel descriptions, then the schedule (and saving)
 */
export const GENERATION_STAGES = ['reading', 'content', 'descriptions', 'schedule'] as const;
export type GenerationStage = (typeof GENERATION_STAGES)[number];

export interface GenerationProgress {
  stage: GenerationStage;
  /** Estimated share of the output written so far, 0-1 */
  progress: number;
}
