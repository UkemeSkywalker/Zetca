/**
 * Video Insights Agent: picks search phrases from a video, and writes titles
 * and a description around keywords researched on YouTube.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { TopicsSchema, WrittenSuggestionsSchema, type WrittenSuggestions } from '../models/videoInsights';
import { StructuredOutputException } from './errors';
import { runAgent, STRUCTURED_OUTPUT_ONLY } from './runAgent';
import type { AgentCredentials } from './strategistAgent';

const TOPICS_PROMPT = `You find the search phrases people would type into YouTube to find a video.
Rules:
1. Use only words that appear in the given title or transcript. Never add brand names, numbers or topics that aren't there.
2. Each phrase is 2-5 words, lowercase, how a viewer would search (e.g. "home workout for beginners").
3. Most specific and most searched first. At most 6.
${STRUCTURED_OUTPUT_ONLY}`;

const WRITE_PROMPT = `You write YouTube titles and descriptions that rank in search, using keywords researched from real YouTube results.
Rules:
1. Every title uses at least one of the given search phrases, word for word. Put it near the start.
2. Titles are 30-70 characters, specific and honest. No ALL CAPS words, at most one "!", no emojis.
3. Only say what the transcript or title supports. Never invent facts, numbers, names, links or promises.
4. Description: the top search phrase in the first sentence; then 2-3 short paragraphs about what is in the video; then one call to action. Use 2-4 of the search phrases naturally. Plain text, no hashtags, no timestamps.
5. Write in the language asked for. Never use < or >.
${STRUCTURED_OUTPUT_ONLY}`;

export class VideoInsightsAgent {
  private model: BedrockModel;

  constructor({ awsRegion, modelId = 'us.anthropic.claude-sonnet-4-6', awsAccessKeyId, awsSecretAccessKey }: AgentCredentials) {
    this.model = new BedrockModel({
      modelId,
      region: awsRegion,
      requestTimeout: 90_000,
      clientConfig: {
        maxAttempts: 2,
        ...(awsAccessKeyId && awsSecretAccessKey ? { credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } } : {}),
      },
    });
  }

  async topics(title: string, transcript: string): Promise<string[]> {
    const agent = new Agent({ model: this.model, systemPrompt: TOPICS_PROMPT, structuredOutputSchema: TopicsSchema });
    const result = await runAgent(agent, 'video-topics', `Title: ${title || '(none yet)'}\n\nTranscript:\n${transcript || '(no speech)'}`);
    if (!result.structuredOutput) throw new StructuredOutputException('No search phrases returned');
    return (result.structuredOutput as { phrases: string[] }).phrases;
  }

  async write(input: {
    title: string;
    transcript: string;
    keywords: { phrase: string; score: number }[];
    language: string;
    isShort: boolean;
  }): Promise<WrittenSuggestions> {
    const agent = new Agent({ model: this.model, systemPrompt: WRITE_PROMPT, structuredOutputSchema: WrittenSuggestionsSchema });
    const prompt = `Language: ${input.language}
Format: ${input.isShort ? 'YouTube Short (keep the description to 1-2 sentences)' : 'long video'}
Current title: ${input.title || '(none)'}
Search phrases (best first, with a 0-100 score from YouTube data):
${input.keywords.map((k) => `- ${k.phrase} (${k.score})`).join('\n')}

Transcript:
${input.transcript || '(no speech; rely on the title only and keep it short)'}`;
    const result = await runAgent(agent, 'video-write', prompt);
    if (!result.structuredOutput) throw new StructuredOutputException('No suggestions returned');
    return result.structuredOutput as WrittenSuggestions;
  }
}

/** Without Bedrock: phrases from the title's words, titles built from them */
export class MockVideoInsightsAgent {
  async topics(title: string, transcript: string): Promise<string[]> {
    const words = (title || transcript).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2);
    return [words.slice(0, 3).join(' '), words.slice(0, 2).join(' ')].filter(Boolean);
  }

  async write(input: { title: string; keywords: { phrase: string }[] }): Promise<WrittenSuggestions> {
    const k = input.keywords[0]?.phrase ?? input.title;
    return {
      titles: [`${k}: a complete guide`, `${k} for beginners`, `How to get started with ${k}`],
      description: `${k} explained step by step.\n\nIn this video we walk through it from the start.\n\nSubscribe for more.`,
    };
  }
}
