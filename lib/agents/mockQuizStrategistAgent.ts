/**
 * Mock Quiz Strategist Agent for testing and development.
 *
 * Builds a strategy and 5-part channel descriptions from templates using the
 * quiz answers, without calling Bedrock.
 */

import {
  ChannelDescription,
  DESCRIPTION_LIMITS,
  GenerationStage,
  PlatformId,
  QuizAnswers,
  Schedule,
  StrategyInput,
  StrategyOutput,
  WEEKDAYS,
} from '../models/strategy';
import type { GenerateStrategyOptions } from '../services/strategyService';

const MOCK_PROGRESS: Array<[GenerationStage, number]> = [
  ['reading', 0],
  ['content', 0.3],
  ['descriptions', 0.6],
  ['schedule', 0.9],
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SHORT_BIO_PLATFORMS: PlatformId[] = ['instagram', 'tiktok', 'x', 'facebook'];

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Spread the cadence across the week, e.g. 3 -> Mon, Wed, Fri */
function pickDays(cadence: number): Schedule['days'] {
  if (cadence >= 7) return [...WEEKDAYS];
  const step = 7 / cadence;
  return Array.from({ length: cadence }, (_, i) => WEEKDAYS[Math.floor(i * step) % 7]);
}

function describe(brand: string, quiz: QuizAnswers, platform: PlatformId, variant = 0): ChannelDescription {
  const niche = quiz.niches[0]?.label.toLowerCase() ?? 'content';
  const [second, ...others] = quiz.secondary_keywords;
  const audience = quiz.skill_level === 'pro' ? 'experienced creators' : quiz.skill_level === 'intermediate' ? 'people who know the basics' : 'complete beginners';
  const days = pickDays(quiz.cadence);
  const openers = ['', 'Your go-to for ', 'Welcome to '];

  if (SHORT_BIO_PLATFORMS.includes(platform)) {
    const limit = DESCRIPTION_LIMITS[platform];
    const parts: ChannelDescription = {
      platform,
      hook: `${openers[variant % openers.length]}${capitalise(quiz.primary_keyword)}`,
      audience: `| For ${audience}`,
      content: second ? `| ${capitalise(second)}` : '',
      value: `| ${quiz.cadence}x a week`,
      cta: '👇 Follow',
    };
    const joined = [parts.hook, parts.audience, parts.content, parts.value, parts.cta].filter(Boolean).join(' ');
    return joined.length <= limit ? parts : { ...parts, content: '', value: '' };
  }

  return {
    platform,
    hook: `${openers[variant % openers.length]}${capitalise(quiz.primary_keyword)} from ${brand}, made for real life.`,
    audience: `Whether you're one of the ${audience} or getting back into ${niche}, ${second ? `these ${second} videos` : 'this channel'} meet you where you are.`,
    content: `Expect ${others.length ? others.join(', ') + ' and ' : ''}practical ${niche} tips you can use straight away. Every video tackles ${quiz.struggles[0]?.toLowerCase() ?? 'the questions you actually have'} head on.`,
    value: `New videos every ${days.join(', ')}.`,
    cta: `Hit subscribe and start today 💪`,
  };
}

export class MockQuizStrategistAgent {
  async generateStrategy(input: StrategyInput, { onProgress }: GenerateStrategyOptions = {}): Promise<StrategyOutput> {
    if (!input.quiz) throw new Error('MockQuizStrategistAgent requires quiz answers');
    // Walk through the stages so the generating screen can be tried without Bedrock
    for (const [stage, progress] of MOCK_PROGRESS) {
      onProgress?.({ stage, progress });
      await sleep(400);
    }
    const quiz = input.quiz;
    const topics = quiz.topics.map((t) => t.topic);
    return {
      content_pillars: [...topics, 'Beginner-friendly tutorials', 'Habits & motivation', 'Community wins'].slice(0, 4),
      posting_schedule: `${quiz.cadence} posts per week`,
      platform_recommendations: quiz.platforms.map((p, i) => ({
        platform: p,
        rationale: i === 0 ? 'Main home for long-form, searchable content' : 'Repurpose highlights as short clips and carousels',
        priority: i === 0 ? 'high' : 'medium',
      })),
      content_themes: ['Quick wins', 'Step-by-step walkthroughs', 'Myth busting', 'Weekly check-ins', 'Behind the scenes'],
      engagement_tactics: [
        'Pin a comment asking viewers for their goal this week',
        'Run a 7-day challenge playlist',
        'Poll the audience on next week’s topic',
        'Reply to every question in the first 2 hours',
      ],
      visual_prompts: ['Bright, clean home setup with natural light', 'Bold thumbnail text with a friendly face'],
      channel_descriptions: quiz.platforms.map((p) => describe(input.brand_name, quiz, p)),
      schedule: { days: pickDays(quiz.cadence), best_time: '7:00 AM – 9:00 AM', focus: 'Consistent, high-energy mornings' },
    };
  }

  async regenerateDescription(brandName: string, quiz: QuizAnswers, platform: PlatformId): Promise<ChannelDescription> {
    await sleep(800);
    return describe(brandName, quiz, platform, Math.floor(Math.random() * 3) + 1);
  }
}
