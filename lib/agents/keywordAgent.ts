/**
 * Keyword Agent using the Strands Agents TypeScript SDK with Amazon Bedrock.
 *
 * Suggests search keywords for the Strategist quiz from the creator's niche,
 * topics and audience. Uses structured output (a Zod schema) so the response
 * is always a plain list of phrases.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { KeywordRequest, KeywordResponseSchema } from '../models/keywords';
import { cleanKeywords } from '../strategist/keywords';
import { StructuredOutputException } from './errors';
import type { AgentCredentials } from './strategistAgent';

const SYSTEM_PROMPT = `You are a YouTube and social media SEO specialist.

Given a creator's niche, core topics and target audience, suggest the search phrases their
ideal viewers actually type into YouTube, Google, Instagram or TikTok search.

Rules:
1. Return 8 phrases, most relevant first. The first phrase must be the single best main
   keyword for the channel: it should describe the channel's core promise in viewers' words.
2. Use real search intent: how people phrase it ("how to…", "… for beginners", "best …",
   "… at home", "… in 15 minutes"), not marketing slogans.
3. Match the audience's skill level (beginner phrasing for beginners, more specific
   phrasing for advanced viewers).
4. Each phrase is lowercase, 2 to 6 words, with no hashtags, emojis, quotes or brand names.
5. Cover the creator's selected topics; when there are several niches, include phrases
   that bridge them only if people genuinely search that way.
6. Do not repeat near-duplicates (e.g. "home workout" and "home workouts").`;

export class KeywordAgent {
  private agent: Agent;

  constructor({ awsRegion, modelId = 'anthropic.claude-3-haiku-20240307-v1:0', awsAccessKeyId, awsSecretAccessKey }: AgentCredentials) {
    const model = new BedrockModel({
      modelId,
      region: awsRegion,
      requestTimeout: 60_000,
      clientConfig: {
        maxAttempts: 2,
        ...(awsAccessKeyId && awsSecretAccessKey
          ? { credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } }
          : {}),
      },
    });

    this.agent = new Agent({
      model,
      systemPrompt: SYSTEM_PROMPT,
      structuredOutputSchema: KeywordResponseSchema,
    });
  }

  async suggestKeywords(input: KeywordRequest): Promise<string[]> {
    const topics = input.topics.length
      ? input.topics.map((t) => `${t.niche} › ${t.topic}`).join(', ')
      : 'none selected';
    const userPrompt = `Suggest search keywords for this creator:

Niches: ${input.niches.join(', ')}
Core topics: ${topics}
Audience skill level: ${input.skill_level ?? 'not specified'}
Audience age ranges: ${input.age_ranges.join(', ') || 'not specified'}
Audience interests: ${input.interests.join(', ') || 'not specified'}
Audience struggles: ${input.struggles.join(', ') || 'not specified'}
Platforms: ${input.platforms.join(', ') || 'not specified'}
Content types: ${input.content_types.join(', ') || 'not specified'}`;

    const result = await this.agent.invoke(userPrompt);
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Keyword agent failed to return structured output');
    }
    const { keywords } = result.structuredOutput as { keywords: string[] };
    return cleanKeywords(keywords);
  }
}
