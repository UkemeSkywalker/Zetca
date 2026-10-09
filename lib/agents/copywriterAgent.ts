/**
 * Real Copywriter Agent using the Strands Agents TypeScript SDK with Amazon Bedrock.
 *
 * Generates platform-specific social media copies via Amazon Bedrock, using
 * structured output (Zod schemas) for CopyOutput and ChatResponse.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import {
  CopyChatDecision,
  CopyChatDecisionSchema,
  CopyChatMessage,
  CopyItem,
  CopyOutput,
  StrategyData,
  ChatResponse,
  ChatResponseSchema,
  COPIES_PER_PLATFORM,
} from '../models/copy';
import { COPY_PLATFORMS, COPY_PLATFORM_IDS, CopyPlatformId } from '../models/copyConstants';
import { StructuredOutputException } from './errors';
import { COPY_FORMAT, createCopyStreamParser } from './copyStreamParser';
import { runAgent, streamDelta, STRUCTURED_OUTPUT_ONLY } from './runAgent';
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

/** The seven angles of a full set, one copy each */
export const COPY_ANGLES = [
  'Bold hook — attention-grabbing opening',
  'Storytelling — emotional narrative',
  'Question-driven — sparks conversation',
  'Educational — thought leadership',
  'Social proof — credibility and trust',
  'Short and punchy — scroll-stopping brevity',
  'CTA-focused — drives action (clicks, saves, shares)',
];

/** The brand context every prompt carries */
function brandContext(strategyData: StrategyData): string {
  const list = (value: unknown) => (Array.isArray(value) ? value.join(', ') : String(value ?? 'N/A'));
  return `Brand Name: ${strategyData.brand_name ?? 'N/A'}
Industry: ${strategyData.industry ?? 'N/A'}
Target Audience: ${strategyData.target_audience ?? 'N/A'}
Goals: ${strategyData.goals ?? 'N/A'}

Content Pillars: ${list(strategyData.content_pillars)}
Content Themes: ${list(strategyData.content_themes)}
Engagement Tactics: ${list(strategyData.engagement_tactics)}
Posting Schedule: ${strategyData.posting_schedule ?? 'N/A'}`;
}

function buildPlatformPrompt(strategyData: StrategyData, platform: CopyPlatformId): string {
  const { promptName, limit } = COPY_PLATFORMS[platform];
  return `Write social media copies for this brand strategy:

${brandContext(strategyData)}

Write exactly ${COPIES_PER_PLATFORM} copies for ${promptName}, one for each angle below, in this order.
Keep each copy's text under ${limit} characters. Each copy needs engaging caption text and relevant hashtags.

${COPY_ANGLES.map((angle, i) => `${i + 1}. ${angle}`).join('\n')}

${COPY_FORMAT}`;
}

function buildChatPrompt(
  strategyData: StrategyData,
  history: CopyChatMessage[],
  message: string,
  openCopy?: { text: string; platform: string; hashtags: string[] }
): string {
  const conversation = history.length
    ? history.map((m) => `${m.role === 'user' ? 'User' : 'You'}: ${m.text}`).join('\n')
    : '(none yet)';
  const platforms = COPY_PLATFORM_IDS.map((id) => `${COPY_PLATFORMS[id].promptName} (under ${COPY_PLATFORMS[id].limit} characters)`).join(', ');
  const open = openCopy
    ? `The user has this ${openCopy.platform} copy open:
Text: ${openCopy.text}
Hashtags: ${openCopy.hashtags.join(' ') || 'None'}`
    : 'The user has no copy open.';

  return `You are chatting with the user in their Copywriter workspace for this brand:

${brandContext(strategyData)}

Platforms: ${platforms}

${open}

Conversation so far:
${conversation}

User: ${message}

Decide what to do:
- If they ask you to change, shorten, rewrite or improve the open copy, use "update" and return the full rewritten copy on the same platform.
- If they ask for a new post or caption, use "create" and return one copy. Pick the platform they name; if they name none, use the open copy's platform, or Instagram.
- If they ask for a full set, a batch, or copies for every platform, use "generate_all".
- Otherwise use "reply" and answer briefly.`;
}

export class CopywriterAgent {
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

  // A Strands Agent handles one invocation at a time, so each request gets its own;
  // the Bedrock model (and its client) is shared. Every prompt carries its full
  // context, so no conversation history is needed across calls.
  private createAgent({ structured = true } = {}): Agent {
    return new Agent({
      model: this.model,
      systemPrompt: structured ? `${SYSTEM_PROMPT}\n\n${STRUCTURED_OUTPUT_ONLY}` : SYSTEM_PROMPT,
    });
  }

  /** A full set: every platform written at once, in parallel */
  async generateCopies(strategyData: StrategyData): Promise<CopyOutput> {
    const perPlatform = await Promise.all(COPY_PLATFORM_IDS.map((p) => this.generatePlatformCopies(strategyData, p)));
    return { copies: perPlatform.flat() };
  }

  /**
   * Write one platform's copies. `onCopy` is called with each copy as soon as
   * the model finishes writing it, before the rest of the output arrives;
   * `onWriting` with the copy in progress as it grows.
   */
  async generatePlatformCopies(
    strategyData: StrategyData,
    platform: CopyPlatformId,
    onCopy?: (copy: CopyItem) => void,
    onWriting?: (partial: { text: string; angle?: string }) => void
  ): Promise<CopyItem[]> {
    // Full sets are written as plain labelled text, not structured output: Bedrock only
    // sends structured output once it's complete, so it couldn't be shown as it's written
    const parse = createCopyStreamParser(COPY_PLATFORMS[platform].promptName);
    const copies: CopyItem[] = [];
    await runAgent(this.createAgent({ structured: false }), `copies:${platform}`, buildPlatformPrompt(strategyData, platform), {
      onEvent: (event) => {
        const delta = streamDelta(event);
        if (delta?.type !== 'textDelta') return;
        for (const copy of parse(delta.text)) {
          if (copies.length >= COPIES_PER_PLATFORM) return;
          copies.push(copy);
          onCopy?.(copy);
        }
        const partial = parse.partial();
        if (partial && copies.length < COPIES_PER_PLATFORM) onWriting?.(partial);
      },
    });
    if (copies.length === 0) {
      throw new StructuredOutputException(`Copywriter agent wrote no copies for ${platform}`);
    }
    return copies;
  }

  /** Decide how to answer a chat message: reply, write one copy, rewrite the open one, or start a full set */
  async chat(
    strategyData: StrategyData,
    history: CopyChatMessage[],
    message: string,
    openCopy?: { text: string; platform: string; hashtags: string[] }
  ): Promise<CopyChatDecision> {
    const result = await runAgent(this.createAgent(), 'copy-chat', buildChatPrompt(strategyData, history, message, openCopy), {
      structuredOutputSchema: CopyChatDecisionSchema,
    });
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Copywriter agent failed to return a chat decision');
    }
    return result.structuredOutput as CopyChatDecision;
  }

  async chatRefine(
    copyText: string,
    platform: string,
    hashtags: string[],
    strategyData: StrategyData,
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

    const result = await runAgent(this.createAgent(), 'copy-chat', userPrompt, { structuredOutputSchema: ChatResponseSchema });
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Copywriter agent failed to return structured chat response');
    }
    return result.structuredOutput as ChatResponse;
  }
}
