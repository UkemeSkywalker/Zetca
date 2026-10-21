/**
 * Video Writer Agent: drafts a YouTube title, description and tags.
 * Strands Agents SDK with Amazon Bedrock, using structured output.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { VideoWriterRequest, VideoWriterResponse, VideoWriterResponseSchema } from '../models/videoWriter';
import { StructuredOutputException } from './errors';
import { runAgent, STRUCTURED_OUTPUT_ONLY } from './runAgent';
import type { AgentCredentials } from './strategistAgent';
import { cleanVideoCopy } from '../youtube/videoCopy';

const SYSTEM_PROMPT = `You are a YouTube copywriter who writes titles and descriptions that rank in search and get clicks without clickbait.

Rules:
1. Title: at most 90 characters. Put the main search phrase near the start. Specific and honest; no ALL CAPS words, no emojis.
2. Description: the first 150 characters are shown in search, so open with what the viewer gets, using the main search phrase once.
   Then 2-4 short paragraphs, then one call to action (subscribe, comment or watch next). Plain text, no markdown, no hashtags.
   Do not invent links, timestamps, product names, prices or facts the creator didn't give.
3. For a Short, keep the description to 1-2 sentences.
4. Tags: 5-12 search phrases viewers actually type, lowercase, no hashtags or commas.
5. Never use the characters < or >.
6. Write in the language the creator asks for; otherwise match the language of the brief.

${STRUCTURED_OUTPUT_ONLY}`;

export class VideoWriterAgent {
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

  async write(input: VideoWriterRequest): Promise<VideoWriterResponse> {
    const minutes = input.durationSeconds ? `${Math.round(input.durationSeconds / 60)} minutes` : 'unknown';
    const userPrompt = `Write the title, description and tags for this video.

What it's about: ${input.brief}
Format: ${input.isShort ? 'YouTube Short' : 'long video'}
Length: ${minutes}
File name: ${input.filename ?? 'unknown'}
Language: ${input.language ?? 'match the brief'}`;

    const agent = new Agent({ model: this.model, systemPrompt: SYSTEM_PROMPT, structuredOutputSchema: VideoWriterResponseSchema });
    const result = await runAgent(agent, 'video-writer', userPrompt);
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Video writer failed to return structured output');
    }
    return cleanVideoCopy(result.structuredOutput as VideoWriterResponse);
  }
}
