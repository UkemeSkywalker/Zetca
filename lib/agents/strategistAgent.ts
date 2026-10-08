/**
 * Real Strategist Agent using the Strands Agents TypeScript SDK with Amazon Bedrock.
 *
 * Generates social media strategies via Amazon Bedrock. Uses structured
 * output (a Zod schema) to ensure the response conforms to StrategyOutput.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { StrategyInput, StrategyOutput, StrategyOutputSchema } from '../models/strategy';
import { StructuredOutputException } from './errors';
import { runAgent } from './runAgent';

const SYSTEM_PROMPT = `You are an expert social media strategist with deep knowledge of digital marketing,
content strategy, and audience engagement across multiple platforms.

Your role is to analyze brand information and generate comprehensive, actionable social media
strategies tailored to the specific industry, target audience, and business goals provided.

When generating strategies:
1. Consider the unique characteristics of the industry and competitive landscape
2. Tailor content pillars to resonate with the target audience
3. Recommend platforms based on where the target audience is most active
4. Provide specific, actionable content themes rather than generic advice
5. Suggest engagement tactics that build authentic community connections
6. Ensure posting schedules are realistic and sustainable
7. Generate 2-3 visual/image generation prompts that directly align with and support your
   recommended content themes and engagement tactics
8. Each visual prompt should describe a specific image that would be appropriate for posts
   related to the strategy (e.g., if recommending customer testimonials, describe an image
   of a satisfied customer; if recommending behind-the-scenes content, describe a workspace scene)
9. Visual prompts should be detailed enough to pass to an image generation AI or designer
10. Visual prompts must be directly relevant to the content strategy - they should
    visually represent the themes and tactics you're recommending, not generic stock imagery

IMPORTANT: The visual prompts must be directly relevant to the content strategy - they should
visually represent the themes and tactics you're recommending, not generic stock imagery.

Generate strategies that are practical, data-informed, and aligned with current social media
best practices.`;

export interface AgentCredentials {
  awsRegion: string;
  modelId?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
}

export class StrategistAgent {
  private model: BedrockModel;

  constructor({
    awsRegion,
    modelId = 'anthropic.claude-3-haiku-20240307-v1:0',
    awsAccessKeyId,
    awsSecretAccessKey,
  }: AgentCredentials) {
    this.model = new BedrockModel({
      modelId,
      region: awsRegion,
      requestTimeout: 300_000,
      clientConfig: {
        maxAttempts: 2,
        ...(awsAccessKeyId && awsSecretAccessKey
          ? { credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } }
          : {}),
      },
    });
  }

  async generateStrategy(input: StrategyInput): Promise<StrategyOutput> {
    const userPrompt = `Generate a comprehensive social media strategy for the following brand:

Brand Name: ${input.brand_name}
Industry: ${input.industry}
Target Audience: ${input.target_audience}
Goals: ${input.goals}

Provide a detailed strategy that includes content pillars, posting schedule, platform recommendations,
content themes, engagement tactics, and visual prompts for image generation that align with the strategy.`;

    // A Strands Agent handles one invocation at a time, so each request gets its own;
    // the Bedrock model (and its client) is shared
    const agent = new Agent({
      model: this.model,
      systemPrompt: SYSTEM_PROMPT,
      structuredOutputSchema: StrategyOutputSchema,
    });
    const result = await runAgent(agent, 'strategy', userPrompt);
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Strategist agent failed to return structured output');
    }
    return result.structuredOutput as StrategyOutput;
  }
}
