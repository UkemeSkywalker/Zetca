/**
 * TypeScript types for Strategist Agent Backend
 * These types match the Pydantic models in the Python service
 */

/**
 * Input data for strategy generation
 */
export interface StrategyInput {
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
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
  createdAt: string;
}
