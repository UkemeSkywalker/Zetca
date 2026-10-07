/**
 * Real Copywriter Agent using the Strands Agents TypeScript SDK with Amazon Bedrock.
 *
 * Generates platform-specific social media copies via Amazon Bedrock, using
 * structured output (Zod schemas) for CopyOutput and ChatResponse.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { CopyOutput, CopyOutputSchema, ChatResponse, ChatResponseSchema } from '../models/copy';
import { StructuredOutputException } from './errors';
import { AgentCredentials } from './strategistAgent';

const SYSTEM_PROMPT = `You are an expert social media copywriter with deep expertise in crafting
engaging, platform-specific content that drives engagement and conversions.

Your role is to generate compelling social media copies (captions with hashtags) based on
brand strategy data. Each copy should be tailored to the specific platform's best practices,
audience expectations, and content format.

Platform-specific guidelines:
- Instagram: Visual-first, storytelling captions (up to 2200 chars), 5-15 relevant hashtags,
  use emojis strategically, include call-to-action
- Twitter/X: Concise and punchy (280 chars max), 1-3 hashtags, conversational tone,
  encourage retweets and replies
- LinkedIn: Professional tone, thought leadership focus, 1-3 hashtags, longer form acceptable,
  industry insights and value-driven content
- Facebook: Conversational and community-focused, 1-3 hashtags, encourage comments and shares,
  can be longer form with storytelling elements
- TikTok: Trendy, casual, Gen-Z friendly language, 3-5 trending hashtags, hook in first line,
  reference trends when appropriate

When generating copies:
1. Use the brand's content pillars and themes as the foundation
2. Align with the engagement tactics specified in the strategy
3. Match the tone to the target audience demographics
4. Include relevant, trending hashtags appropriate for each platform
5. Ensure each copy is unique and platform-optimized
6. Generate SEVEN different copy variations per platform from the platform_recommendations
7. Each variation should take a different angle: storytelling, question-driven, educational, CTA-focused, social proof, bold hook, short and punchy

When refining copies via chat:
1. Understand the user's specific request (tone change, length adjustment, hashtag updates)
2. Maintain brand consistency while implementing requested changes
3. Explain what changes were made and why
4. Preserve the core message while adapting to feedback`;

export interface CopyStreamEvent {
  event: 'thinking' | 'lifecycle' | 'result' | 'error';
  text?: string;
  phase?: string;
  copies?: Array<{ text: string; platform: string; hashtags: string[] }>;
  message?: string;
}

function buildCopiesPrompt(strategyData: Record<string, any>): string {
  const platforms = strategyData.platform_recommendations || [];
  const platformNames =
    platforms.length && typeof platforms[0] === 'object' ? platforms.map((p: any) => p.platform || '') : platforms;
  const contentPillars = strategyData.content_pillars || [];
  const contentThemes = strategyData.content_themes || [];
  const engagementTactics = strategyData.engagement_tactics || [];

  const pillarsStr = Array.isArray(contentPillars) ? contentPillars.join(', ') : String(contentPillars);
  const themesStr = Array.isArray(contentThemes) ? contentThemes.join(', ') : String(contentThemes);
  const tacticsStr = Array.isArray(engagementTactics) ? engagementTactics.join(', ') : String(engagementTactics);

  return `Generate social media copies for the following brand strategy:

Brand Name: ${strategyData.brand_name ?? 'N/A'}
Industry: ${strategyData.industry ?? 'N/A'}
Target Audience: ${strategyData.target_audience ?? 'N/A'}
Goals: ${strategyData.goals ?? 'N/A'}

Content Pillars: ${pillarsStr}
Content Themes: ${themesStr}
Engagement Tactics: ${tacticsStr}
Posting Schedule: ${strategyData.posting_schedule ?? 'N/A'}

IMPORTANT: Generate exactly 7 unique copy variations for EACH of these 4 platforms: Twitter/X, Instagram, LinkedIn, Facebook.
That means 28 total CopyItems in the output (7 for Twitter, 7 for Instagram, 7 for LinkedIn, 7 for Facebook).

Each copy must include engaging caption text and relevant hashtags tailored to the platform.
Each of the 7 variations per platform should take a different angle:
1. Bold hook — attention-grabbing opening
2. Storytelling — emotional narrative
3. Question-driven — sparks conversation
4. Educational — thought leadership
5. Social proof — credibility and trust
6. Short and punchy — scroll-stopping brevity
7. CTA-focused — drives action (clicks, saves, shares)`;
}

export class CopywriterAgent {
  private agent: Agent;

  constructor({
    awsRegion,
    modelId = 'anthropic.claude-3-haiku-20240307-v1:0',
    awsAccessKeyId,
    awsSecretAccessKey,
  }: AgentCredentials) {
    const model = new BedrockModel({
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

    this.agent = new Agent({ model, systemPrompt: SYSTEM_PROMPT });
  }

  async generateCopies(strategyData: Record<string, any>): Promise<CopyOutput> {
    const result = await this.agent.invoke(buildCopiesPrompt(strategyData), {
      structuredOutputSchema: CopyOutputSchema,
    });
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Copywriter agent failed to return structured output');
    }
    return result.structuredOutput as CopyOutput;
  }

  /**
   * Stream copy generation progress for the SSE endpoint.
   *
   * Note: the Strands TS SDK's raw stream event shape for structured output
   * is not yet consulted here reliably, so this streams best-effort
   * "thinking" progress via text deltas, then makes a single deterministic
   * `invoke()` call (same as generateCopies) to guarantee a correctly
   * validated final result. This costs one extra model round-trip but
   * keeps the persisted data provably correct.
   */
  async *generateCopiesStream(strategyData: Record<string, any>): AsyncIterator<CopyStreamEvent> {
    const prompt = buildCopiesPrompt(strategyData);
    yield { event: 'lifecycle', phase: 'Connecting to Bedrock model...' };

    try {
      yield { event: 'lifecycle', phase: 'Agent loop initialized' };
      yield { event: 'lifecycle', phase: 'Processing strategy data...' };

      for await (const chunk of this.agent.stream(prompt)) {
        const text = (chunk as any)?.event?.delta?.text;
        if (typeof text === 'string' && text.length > 0) {
          yield { event: 'thinking', text };
        }
      }

      const output = await this.generateCopies(strategyData);
      yield {
        event: 'result',
        copies: output.copies.map((c) => ({ text: c.text, platform: c.platform, hashtags: c.hashtags })),
      };
    } catch (e: any) {
      yield { event: 'error', message: e?.message ?? String(e) };
    }
  }

  async chatRefine(
    copyText: string,
    platform: string,
    hashtags: string[],
    strategyData: Record<string, any>,
    userMessage: string
  ): Promise<ChatResponse> {
    const hashtagsStr = hashtags.length ? hashtags.join(', ') : 'None';
    const userPrompt = `I need you to refine the following social media copy based on my feedback.

Current Copy:
- Platform: ${platform}
- Text: ${copyText}
- Hashtags: ${hashtagsStr}

Brand Context:
- Brand: ${strategyData.brand_name ?? 'N/A'}
- Industry: ${strategyData.industry ?? 'N/A'}
- Target Audience: ${strategyData.target_audience ?? 'N/A'}
- Content Pillars: ${(strategyData.content_pillars || []).join(', ')}

My feedback: ${userMessage}

Please update the copy based on my feedback while maintaining brand consistency.
Provide the updated text, updated hashtags, and explain what changes you made.`;

    const result = await this.agent.invoke(userPrompt, { structuredOutputSchema: ChatResponseSchema });
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Copywriter agent failed to return structured chat response');
    }
    return result.structuredOutput as ChatResponse;
  }
}
