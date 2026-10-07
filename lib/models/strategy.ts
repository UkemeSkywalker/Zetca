/**
 * Zod schemas and types for strategy data validation and serialization.
 *
 * Field names are intentionally snake_case: these shapes are the wire
 * format consumed by lib/api/strategyClient.ts (request bodies sent and
 * JSON responses parsed), matching the API contract the Python service
 * used to serve. Keeping snake_case here avoids a translation layer.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

export const StrategyInputSchema = z.object({
  brand_name: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  industry: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  target_audience: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
  goals: z.string().trim().min(1, 'Field cannot be empty or whitespace only'),
});
export type StrategyInput = z.infer<typeof StrategyInputSchema>;

export const PlatformRecommendationSchema = z.object({
  platform: z.string().describe('Platform name (e.g., Instagram, LinkedIn, Twitter)'),
  rationale: z.string().describe('Why this platform is recommended for the brand'),
  priority: z.enum(['high', 'medium', 'low']).describe('Priority level for this platform'),
});
export type PlatformRecommendation = z.infer<typeof PlatformRecommendationSchema>;

export const StrategyOutputSchema = z.object({
  content_pillars: z
    .array(z.string())
    .min(3)
    .max(6)
    .describe('3-6 core content themes that align with brand identity and resonate with the target audience'),
  posting_schedule: z.string().describe('Recommended posting frequency and optimal timing for maximum engagement'),
  platform_recommendations: z
    .array(PlatformRecommendationSchema)
    .min(2)
    .describe('Recommended social media platforms with rationale and priority'),
  content_themes: z
    .array(z.string())
    .min(5)
    .describe('Specific content ideas and topics aligned with content pillars'),
  engagement_tactics: z
    .array(z.string())
    .min(4)
    .describe('Strategies for audience interaction and community building'),
  visual_prompts: z
    .array(z.string())
    .min(2)
    .max(3)
    .describe(
      '2-3 detailed image generation prompts that align with content themes and engagement tactics, designed to be passed to a Designer Agent for creating graphics'
    ),
});
export type StrategyOutput = z.infer<typeof StrategyOutputSchema>;

export interface StrategyRecord {
  id: string;
  user_id: string;
  brand_name: string;
  industry: string;
  target_audience: string;
  goals: string;
  strategy_output: StrategyOutput;
  created_at: string;
}

export function newStrategyRecord(
  input: StrategyInput,
  userId: string,
  output: StrategyOutput
): StrategyRecord {
  return {
    id: randomUUID(),
    user_id: userId,
    brand_name: input.brand_name,
    industry: input.industry,
    target_audience: input.target_audience,
    goals: input.goals,
    strategy_output: output,
    created_at: new Date().toISOString(),
  };
}
