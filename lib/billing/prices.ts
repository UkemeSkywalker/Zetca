/**
 * What each action costs in credits. 1 credit = $0.01; an action is priced
 * at its real cost plus 40%, rounded, never below 1 credit. The costs come
 * from measured token use and AWS's price list (see the pricing sheet).
 */

export const CREDIT_USD = 0.01;
export const MARGIN = 0.4;
export const MIN_CREDITS = 1;

/** A cost in dollars as credits */
export const creditsFor = (costUsd: number) => Math.max(MIN_CREDITS, Math.round((costUsd * (1 + MARGIN)) / CREDIT_USD));

export const ACTIONS = {
  strategy: { label: 'Strategy', credits: 4 },
  copy_post: { label: 'Copywriter post', credits: 1 },
  copy_chat: { label: 'Copywriter chat message', credits: 2 },
  copy_rewrite: { label: 'Rewrite with AI', credits: 1 },
  design_words: { label: 'Design words', credits: 1 },
  keywords: { label: 'Keyword ideas', credits: 1 },
  video_write: { label: 'YouTube title and description', credits: 2 },
  video_suggestions: { label: 'YouTube titles and description from research', credits: 3 },
  video_topics: { label: 'YouTube topics from the transcript', credits: 2 },
  chapters: { label: 'YouTube chapters', credits: 2 },
  auto_schedule: { label: 'Auto-schedule', credits: 3 },
  transcript: { label: 'Video transcript', credits: 1 },
  ai_image: { label: 'AI image', credits: 1 },
  ai_video: { label: 'AI video', credits: 26 },
  refund: { label: 'Refund', credits: 0 },
  grant: { label: 'Credits added', credits: 0 },
} as const;

export type ActionId = keyof typeof ACTIONS;

/** AWS Transcribe is $0.006 a minute */
export const TRANSCRIBE_USD_PER_MINUTE = 0.006;
export const transcriptCredits = (seconds: number) => creditsFor((Math.max(seconds, 60) / 60) * TRANSCRIBE_USD_PER_MINUTE);

/** Bedrock, Claude Sonnet 4.6 through the US cross-region profile, $ per token */
export const BEDROCK_USD = { input: 3.3 / 1e6, output: 16.5 / 1e6 };
