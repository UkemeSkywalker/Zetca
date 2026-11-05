/**
 * TypeScript types for Strategist Agent Backend
 * These types match the Pydantic models in the Python service
 */

import type { ChannelDescription, QuizAnswers, Schedule } from '@/lib/models/strategy';

export type { ChannelDescription, QuizAnswers, Schedule };

/**
 * Input data for strategy generation
 */
export interface StrategyInput {
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
  /** Structured quiz answers; when present, channel descriptions are generated too */
  quiz?: QuizAnswers;
}

/**
 * Social media platform recommendation
 */
export interface PlatformRecommendation {
  platform: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Generated strategy output from the agent
 */
export interface StrategyOutput {
  contentPillars: string[];
  postingSchedule: string;
  platformRecommendations: PlatformRecommendation[];
  contentThemes: string[];
  engagementTactics: string[];
  visualPrompts: string[];
  /** Only on strategies generated from the quiz */
  channelDescriptions?: ChannelDescription[];
  /** Only on strategies generated from the quiz */
  schedule?: Schedule;
}

/**
 * Complete strategy record stored in database
 */
export interface StrategyRecord {
  id: string;
  userId: string;
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
  strategyOutput: StrategyOutput;
  /** Only on strategies generated from the quiz */
  quiz?: QuizAnswers;
  /** The campaign's design style: every post's visual follows it */
  designStyle?: CampaignDesignStyle;
  createdAt: string;
}

/** A campaign's look: the style, its colours and how posts use its layouts */
export interface CampaignDesignStyle {
  recipeId: string;
  model?: string;
  onNewPosts: boolean;
  /** The campaign's brand colours (otherwise the style's own) */
  colors?: { main: string; ink: string; accent: string };
  /** 'mix' (each post gets the next layout) or one layout's id */
  layout?: string;
}
