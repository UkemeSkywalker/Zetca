/**
 * Chapter Agent: picks where chapters start in a transcript and names them.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { ChapterPicksSchema, type ChapterPicks, numberedTranscript } from '../models/chapters';
import type { Transcript } from '@/types/media';
import { StructuredOutputException } from './errors';
import { runAgent, STRUCTURED_OUTPUT_ONLY } from './runAgent';
import type { AgentCredentials } from './strategistAgent';

const SYSTEM_PROMPT = `You split a video into YouTube chapters using its transcript.

Rules:
1. Each transcript line is "[index] m:ss text". Start a chapter only where the topic clearly changes.
2. The first chapter starts at index 0. Aim for one chapter every 1-3 minutes; at least 3 chapters.
3. Name each chapter in 2-6 words, using words actually spoken in that part. No clickbait, emojis or numbering.
4. Write titles in the language of the transcript.
5. Never use the characters < or >.

${STRUCTURED_OUTPUT_ONLY}`;

export class ChapterAgent {
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

  async pick(transcript: Transcript): Promise<ChapterPicks> {
    const agent = new Agent({ model: this.model, systemPrompt: SYSTEM_PROMPT, structuredOutputSchema: ChapterPicksSchema });
    const result = await runAgent(agent, 'chapters', `Transcript:\n${numberedTranscript(transcript)}`);
    if (!result.structuredOutput) throw new StructuredOutputException('Chapter agent returned no chapters');
    return result.structuredOutput as ChapterPicks;
  }
}

/** Without Bedrock: a chapter every ~quarter of the transcript, named after its first words */
export class MockChapterAgent {
  async pick(transcript: Transcript): Promise<ChapterPicks> {
    const n = transcript.segments.length;
    const step = Math.max(1, Math.floor(n / 4));
    const chapters = [];
    for (let i = 0; i < n; i += step) {
      chapters.push({ segment: i, title: transcript.segments[i].text.split(/\s+/).slice(0, 4).join(' ') });
    }
    return { chapters };
  }
}
