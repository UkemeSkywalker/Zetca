/**
 * Design Writer Agent: writes the few words that go on a design (headline,
 * label, a supporting line) and picks a style for them.
 * Strands Agents SDK with Amazon Bedrock, using structured output.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import {
  cleanDesignText,
  DesignWriterRequest,
  DesignWriterResponse,
  DesignWriterResponseSchema,
} from '../models/designWriter';
import { StructuredOutputException } from './errors';
import { runAgent, STRUCTURED_OUTPUT_ONLY } from './runAgent';
import type { AgentCredentials } from './strategistAgent';

const SYSTEM_PROMPT = `You write the words for bold social media graphics: a few big words people read in under two seconds.

Rules:
1. Headline: 2-7 words, punchy and specific. Use a line break where it reads best. No hashtags, emojis or quotation marks.
2. Kicker: an optional tiny label of 1-3 words, like "Daily reminder" or "Tip #3".
3. Body: only for the headline-body style, one sentence of at most 18 words.
4. Never invent prices, dates, statistics, names or claims the user didn't give.
5. Write in the language of the user's description.
6. photoQuery: 1-3 plain English words for a stock photo that would sit well behind the words. No brand names.

${STRUCTURED_OUTPUT_ONLY}`;

export class DesignWriterAgent {
  private model: BedrockModel;

  constructor({ awsRegion, modelId = 'us.anthropic.claude-sonnet-4-6', awsAccessKeyId, awsSecretAccessKey }: AgentCredentials) {
    this.model = new BedrockModel({
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
  }

  async write(input: DesignWriterRequest): Promise<DesignWriterResponse> {
    const userPrompt = `Write the words for this design.

What the post is about: ${input.prompt}
${input.styleId ? `Style: ${input.styleId} (use this style)` : 'Style: pick the one that suits it best'}`;

    const agent = new Agent({ model: this.model, systemPrompt: SYSTEM_PROMPT, structuredOutputSchema: DesignWriterResponseSchema });
    const result = await runAgent(agent, 'design-writer', userPrompt);
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Design writer failed to return structured output');
    }
    const out = result.structuredOutput as DesignWriterResponse;
    return cleanDesignText(input.styleId ? { ...out, styleId: input.styleId } : out);
  }
}

/** For development without Bedrock */
export class MockDesignWriterAgent {
  async write(input: DesignWriterRequest): Promise<DesignWriterResponse> {
    await new Promise((r) => setTimeout(r, 500));
    const words = input.prompt.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2).slice(0, 5);
    const headline = words.length >= 2 ? `${words.slice(0, 2).join(' ')}\n${words.slice(2).join(' ')}` : 'Show up anyway';
    return cleanDesignText({ styleId: input.styleId ?? 'bold-statement', headline, kicker: 'Daily reminder', body: words.join(' '), photoQuery: words.slice(0, 2).join(' ') || 'fitness' });
  }
}
