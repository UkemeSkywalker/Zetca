/**
 * Quiz Strategist Agent using the Strands Agents TypeScript SDK with Amazon Bedrock.
 *
 * Generates a strategy from the Strategist quiz's structured answers, including
 * a channel description per platform in the 5-part formula and a posting
 * schedule. Also regenerates a single platform's description on request.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import {
  ChannelDescription,
  ChannelDescriptionSchema,
  DESCRIPTION_LIMITS,
  PlatformId,
  QuizAnswers,
  QuizStrategyOutputSchema,
  StrategyInput,
  StrategyOutput,
} from '../models/strategy';
import { StructuredOutputException } from './errors';
import { runAgent, STRUCTURED_OUTPUT_ONLY } from './runAgent';
import { descriptionLength, fitToLimit } from '../strategist/descriptions';
import type { AgentCredentials } from './strategistAgent';

const PLATFORM_NAMES: Record<PlatformId, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  x: 'X',
  facebook: 'Facebook',
};

const GOAL_NAMES: Record<QuizAnswers['goal'], string> = {
  grow: 'Grow audience',
  authority: 'Build authority',
  sell: 'Sell products',
  community: 'Build community',
};

/**
 * A short bio's budget in words, which models keep to far better than character counts:
 * about 7 characters per word (emoji count double), with room to spare
 */
function shortTarget(platform: PlatformId): string {
  return `${Math.floor(DESCRIPTION_LIMITS[platform] / 9)} words`;
}

const DESCRIPTION_FORMULA = `Channel description formula. Write each description as five parts, in this order:
1. HOOK (the most important): place the primary keyword naturally within the first 100 characters.
   This sentence must instantly tell both the platform and viewers exactly what the channel is about.
2. AUDIENCE: introduce the target audience clearly (e.g. "Whether you're a beginner or a professional…")
   and include a secondary keyword naturally.
3. CONTENT (2-3 sentences): describe the type of content viewers will find. Weave in the remaining
   keywords naturally, never stuff them. Use language that reflects real search intent.
4. VALUE (1 sentence): the unique value the channel offers; optionally hint at upload consistency
   (e.g. "New videos every week"), matching the creator's posting cadence.
5. CALL TO ACTION (final sentence): a clear, motivating subscribe/follow prompt tailored to the niche.

Platform limits (the whole description, all five parts joined with spaces, must fit):
- YouTube: ${DESCRIPTION_LIMITS.youtube} characters; aim for 350-600. Full sentences.
- LinkedIn (About section): ${DESCRIPTION_LIMITS.linkedin} characters; aim for 400-800, professional tone.
- Facebook (page intro): ${DESCRIPTION_LIMITS.facebook} characters; aim for ${shortTarget('facebook')} or fewer.
- X (bio): ${DESCRIPTION_LIMITS.x} characters; aim for ${shortTarget('x')} or fewer.
- Instagram (bio): ${DESCRIPTION_LIMITS.instagram} characters; aim for ${shortTarget('instagram')} or fewer.
- TikTok (bio): ${DESCRIPTION_LIMITS.tiktok} characters; aim for ${shortTarget('tiktok')} or fewer.
For the short bios (Instagram, TikTok, X, Facebook) keep all five parts but make each one a very short
phrase (often 1-3 words); the word count is for all five parts together. Emojis and separators like "|" are fine there.
Keep to the word counts above: an over-limit description costs an extra rewrite. Never exceed a platform's limit.`;

const SYSTEM_PROMPT = `You are an expert social media strategist and channel SEO specialist.

You receive a creator's answers from a strategy quiz: their brand, platforms, niches and core
topics, audience (age, skill level, interests, struggles), content types, posting cadence,
chosen keywords and main goal. Generate a practical, specific strategy for exactly this creator.

When generating strategies:
1. Tailor content pillars, themes and engagement tactics to the niches, topics and audience;
   address the audience's struggles directly.
2. Recommend platforms only from the creator's chosen platforms, with a clear role for each:
   priority "high" for the main platform, "medium" for platforms used to repurpose content.
3. The posting schedule must match the creator's cadence (posts per week). Pick specific days,
   a best time window, and a one-line focus.
4. Generate 2-3 detailed image prompts that visually support the themes (not generic stock imagery).
5. Write one channel description per chosen platform, following the formula below and using the
   creator's primary and secondary keywords.
6. Be concise: keep every list item and rationale short and specific, within the lengths the schema gives.

${DESCRIPTION_FORMULA}

${STRUCTURED_OUTPUT_ONLY}`;

const REGENERATE_PROMPT = `You are a channel SEO copywriter. Rewrite one platform's channel description for a
creator, following the formula below and using their keywords. Write a fresh variation: different wording
from the previous version, same facts.

${DESCRIPTION_FORMULA}

${STRUCTURED_OUTPUT_ONLY}`;

const SHORTEN_PROMPT = `You are a channel SEO copywriter. Shorten a channel description so it fits a strict
character limit, keeping the same five parts (hook, audience, content, value, cta) and the primary keyword in the
hook. Count characters carefully: the five parts are joined with single spaces, and the total must be at or under
the limit. Cut words, use short phrases, and leave a part as an empty string if there is no room for it.

${STRUCTURED_OUTPUT_ONLY}`;

// One rewrite, then trim: each attempt adds several seconds to the generation
const MAX_SHORTEN_ATTEMPTS = 1;

function describeQuiz(brandName: string, quiz: QuizAnswers): string {
  const topics = quiz.topics.length ? quiz.topics.map((t) => `${t.niche} › ${t.topic}`).join(', ') : 'none selected';
  return `Brand / channel name: ${brandName}
Platforms: ${quiz.platforms.map((p) => PLATFORM_NAMES[p]).join(', ')}
Niches: ${quiz.niches.map((n) => n.label).join(', ')}
Core topics: ${topics}
Audience age ranges: ${quiz.age_ranges.join(', ') || 'not specified'}
Audience skill level: ${quiz.skill_level ?? 'not specified'}
Audience interests: ${quiz.interests.join(', ') || 'not specified'}
Audience struggles: ${quiz.struggles.join(', ') || 'not specified'}
Content types: ${quiz.content_types.join(', ') || 'not specified'}
Posting cadence: ${quiz.cadence} posts per week
Primary keyword: ${quiz.primary_keyword}
Secondary keywords: ${quiz.secondary_keywords.join(', ') || 'none'}
Main goal: ${GOAL_NAMES[quiz.goal]}`;
}

export class QuizStrategistAgent {
  private model: BedrockModel;

  constructor({ awsRegion, modelId = 'anthropic.claude-3-haiku-20240307-v1:0', awsAccessKeyId, awsSecretAccessKey }: AgentCredentials) {
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
    if (!input.quiz) throw new Error('QuizStrategistAgent requires quiz answers');
    // A Strands Agent handles one invocation at a time, so each request gets its own
    const agent = new Agent({ model: this.model, systemPrompt: SYSTEM_PROMPT, structuredOutputSchema: QuizStrategyOutputSchema });
    const result = await runAgent(agent, 'quiz-strategy', `Generate the strategy for this creator:\n\n${describeQuiz(input.brand_name, input.quiz)}`);
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Quiz strategist agent failed to return structured output');
    }
    const output = result.structuredOutput as StrategyOutput;
    // Keep one description per chosen platform, in the creator's order, each within its limit
    const byPlatform = new Map((output.channel_descriptions ?? []).map((d) => [d.platform, d]));
    const ordered = input.quiz.platforms.flatMap((p) => (byPlatform.has(p) ? [{ ...byPlatform.get(p)!, platform: p }] : []));
    output.channel_descriptions = await Promise.all(ordered.map((d) => this.enforceLimit(d)));
    return output;
  }

  /**
   * Models are poor at counting characters, so check each description against its
   * platform limit, ask for a shorter version if it's over, and trim as a last resort.
   */
  private async enforceLimit(description: ChannelDescription): Promise<ChannelDescription> {
    const limit = DESCRIPTION_LIMITS[description.platform];
    let current = description;
    if (descriptionLength(current) > limit) {
      console.info(`[agent] ${description.platform} description is ${descriptionLength(current)}/${limit} characters; shortening`);
    }
    for (let attempt = 0; attempt < MAX_SHORTEN_ATTEMPTS && descriptionLength(current) > limit; attempt++) {
      try {
        const agent = new Agent({ model: this.model, systemPrompt: SHORTEN_PROMPT, structuredOutputSchema: ChannelDescriptionSchema });
        const result = await runAgent(
          agent,
          `shorten-description:${description.platform}`,
          `Platform: ${PLATFORM_NAMES[description.platform]} (id "${description.platform}"). Limit: ${limit} characters. ` +
            `The current version is ${descriptionLength(current)} characters, so it must lose at least ${descriptionLength(current) - limit}.\n\n` +
            `hook: ${current.hook}\naudience: ${current.audience}\ncontent: ${current.content}\nvalue: ${current.value}\ncta: ${current.cta}`
        );
        if (result.structuredOutput) {
          current = { ...(result.structuredOutput as ChannelDescription), platform: description.platform };
        }
      } catch (err) {
        console.warn(`Shortening the ${description.platform} description failed; trimming instead`, err);
        break;
      }
    }
    return descriptionLength(current) > limit ? fitToLimit(current, limit) : current;
  }

  async regenerateDescription(
    brandName: string,
    quiz: QuizAnswers,
    platform: PlatformId,
    previous?: ChannelDescription
  ): Promise<ChannelDescription> {
    const agent = new Agent({ model: this.model, systemPrompt: REGENERATE_PROMPT, structuredOutputSchema: ChannelDescriptionSchema });
    const previousText = previous
      ? `\n\nPrevious version (write something different):\n${[previous.hook, previous.audience, previous.content, previous.value, previous.cta].join(' ')}`
      : '';
    const result = await runAgent(
      agent,
      `regenerate-description:${platform}`,
      `Write the ${PLATFORM_NAMES[platform]} channel description (platform id "${platform}") for this creator:\n\n${describeQuiz(brandName, quiz)}${previousText}`
    );
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Quiz strategist agent failed to return a channel description');
    }
    return this.enforceLimit({ ...(result.structuredOutput as ChannelDescription), platform });
  }
}
