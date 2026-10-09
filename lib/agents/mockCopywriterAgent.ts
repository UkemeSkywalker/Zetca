/**
 * Mock Copywriter Agent for testing and development.
 *
 * Returns realistic platform-specific copies without calling Bedrock.
 * Follows the same interface as CopywriterAgent so they can be swapped
 * via the useMockAgent config flag.
 */

import { CopyOutput, CopyItem, ChatResponse, StrategyData, CopyChatDecision, CopyChatMessage, COPIES_PER_PLATFORM } from '../models/copy';
import { COPY_PLATFORMS, COPY_PLATFORM_IDS, CopyPlatformId } from '../models/copyConstants';
import { COPY_ANGLES } from './copywriterAgent';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PLATFORM_COPIES: Record<string, { text: string; hashtags: string[] }> = {
  linkedin: {
    text:
      "Great strategies start with understanding your audience. We've been refining our approach to deliver real value — " +
      "here's what we've learned about building meaningful connections in the B2B space. What's your top engagement tip?",
    hashtags: ['#Leadership', '#B2BMarketing', '#Strategy', '#GrowthMindset'],
  },
  twitter: {
    text:
      'Your audience is talking — are you listening? 🎯\n\n3 things we changed this quarter:\n' +
      '✅ More community polls\n✅ Faster reply times\n✅ Real customer stories\n\nResults? 2x engagement. Try it.',
    hashtags: ['#SocialMediaTips', '#MarketingStrategy', '#Engagement'],
  },
  instagram: {
    text:
      'Behind every great brand is a story worth sharing. ✨\n\n' +
      'We believe in showing up authentically — not just with polished posts, but with real moments that connect. ' +
      'Swipe to see how we bring our strategy to life every day. 👉',
    hashtags: ['#BrandStorytelling', '#AuthenticMarketing', '#ContentCreation', '#SocialMediaMarketing', '#InstaStrategy'],
  },
  facebook: {
    text:
      'We asked our community what content they want to see more of — and you delivered! 🙌\n\n' +
      "Based on your feedback, we're rolling out weekly tips, live Q&As, and behind-the-scenes looks at our process. " +
      'Stay tuned and let us know what topics matter most to you!',
    hashtags: ['#CommunityFirst', '#SocialMedia', '#BrandBuilding'],
  },
  youtube: {
    text:
      'NEW VIDEO: How to build a content strategy that actually works 📹\n\n' +
      'In this episode we break down the exact framework we use to plan, create, and measure content across platforms. ' +
      'Timestamps in the description — skip to what matters most to you.',
    hashtags: ['#ContentStrategy', '#MarketingTips', '#YouTubeMarketing'],
  },
  tiktok: {
    text:
      'POV: You finally nailed your content strategy 🎬✨\n\n' +
      'Here are 3 quick wins you can steal today. Save this for later and follow for more marketing tips!',
    hashtags: ['#MarketingTok', '#ContentTips', '#SocialMediaGrowth', '#SmallBusinessTips'],
  },
};

const DEFAULT_COPY = {
  text:
    "Exciting things are happening! We're putting our strategy into action with fresh content designed just for you. " +
    "Stay tuned for updates, tips, and stories that matter. Let us know what you'd like to see next!",
  hashtags: ['#ContentMarketing', '#DigitalStrategy', '#BrandGrowth'],
};

/** Delay between mock copies, so the UI shows them arriving one by one */
const MOCK_COPY_DELAY_MS = 700;

function mockCopy(platform: CopyPlatformId, index: number, brand: string): CopyItem {
  const template = PLATFORM_COPIES[platform === 'x' ? 'twitter' : platform] || DEFAULT_COPY;
  const angle = COPY_ANGLES[index % COPY_ANGLES.length].split(' — ')[0];
  return {
    text: `${angle}: ${template.text.replace('our', `${brand}'s`)}`.slice(0, COPY_PLATFORMS[platform].limit),
    platform: COPY_PLATFORMS[platform].promptName,
    hashtags: [...template.hashtags],
    angle,
  };
}

export class MockCopywriterAgent {
  async generateCopies(strategyData: StrategyData): Promise<CopyOutput> {
    const perPlatform = await Promise.all(COPY_PLATFORM_IDS.map((p) => this.generatePlatformCopies(strategyData, p)));
    return { copies: perPlatform.flat() };
  }

  async generatePlatformCopies(
    strategyData: StrategyData,
    platform: CopyPlatformId,
    onCopy?: (copy: CopyItem) => void,
    onWriting?: (partial: { text: string; angle?: string }) => void
  ): Promise<CopyItem[]> {
    const copies: CopyItem[] = [];
    for (let i = 0; i < COPIES_PER_PLATFORM; i++) {
      const copy = mockCopy(platform, i, strategyData.brand_name || 'the brand');
      // "Type" the copy out over the delay, a few words at a time
      const words = copy.text.split(' ');
      const steps = 8;
      for (let step = 1; step <= steps; step++) {
        await sleep((MOCK_COPY_DELAY_MS + Math.random() * MOCK_COPY_DELAY_MS) / steps);
        onWriting?.({ text: words.slice(0, Math.ceil((words.length * step) / steps)).join(' '), angle: copy.angle });
      }
      copies.push(copy);
      onCopy?.(copy);
    }
    return copies;
  }

  async chat(
    strategyData: StrategyData,
    _history: CopyChatMessage[],
    message: string,
    openCopy?: { text: string; platform: string; hashtags: string[] }
  ): Promise<CopyChatDecision> {
    await sleep(1000);
    const lower = message.toLowerCase();
    if (/full set|all platforms|every platform|batch/.test(lower)) {
      return { reply: 'On it — writing a full set for every platform.', action: 'generate_all' };
    }
    if (openCopy && /punch|short|rewrite|improve|change|tone|add/.test(lower)) {
      return {
        reply: 'Done — I tightened it up and kept the hashtags.',
        action: 'update',
        copy: { ...openCopy, text: `${openCopy.text.split('.')[0]}. [Refined: "${message}"]` },
      };
    }
    if (/write|post|caption|copy|create/.test(lower)) {
      const platform = COPY_PLATFORM_IDS.find((p) => lower.includes(p) || lower.includes(COPY_PLATFORMS[p].label.toLowerCase())) ?? 'instagram';
      return {
        reply: `Here's a new ${COPY_PLATFORMS[platform].label} post — it's on the left.`,
        action: 'create',
        copy: { ...mockCopy(platform, 0, strategyData.brand_name || 'the brand'), angle: 'From chat' },
      };
    }
    return { reply: 'Ask me to write a post, rewrite the open copy, or generate a full set.', action: 'reply' };
  }

  async chatRefine(
    copyText: string,
    platform: string,
    hashtags: string[],
    _strategyData: StrategyData,
    userMessage: string
  ): Promise<ChatResponse> {
    await sleep(1000);

    return {
      updated_text: `${copyText}\n\n[Refined based on your feedback: "${userMessage}"]`,
      updated_hashtags: [...hashtags, '#Refined'],
      ai_message:
        `I've updated the ${platform} copy based on your request. ` +
        'The changes incorporate your feedback while keeping the tone consistent with the brand strategy.',
    };
  }
}
