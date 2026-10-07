/**
 * Mock Copywriter Agent for testing and development.
 *
 * Returns realistic platform-specific copies without calling Bedrock.
 * Follows the same interface as CopywriterAgent so they can be swapped
 * via the useMockAgent config flag.
 */

import { CopyOutput, CopyItem, ChatResponse } from '../models/copy';
import { CopyStreamEvent } from './copywriterAgent';

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

export class MockCopywriterAgent {
  async generateCopies(strategyData: Record<string, any>): Promise<CopyOutput> {
    await sleep(1000);

    const platformRecs: Record<string, any>[] = strategyData.platform_recommendations || [];
    const copies: CopyItem[] = platformRecs.map((rec) => {
      const platformName: string = rec.platform || 'General';
      const template = PLATFORM_COPIES[platformName.toLowerCase()] || DEFAULT_COPY;
      return { text: template.text, platform: platformName, hashtags: [...template.hashtags] };
    });

    if (copies.length === 0) {
      copies.push({ text: DEFAULT_COPY.text, platform: 'General', hashtags: [...DEFAULT_COPY.hashtags] });
    }

    return { copies };
  }

  async *generateCopiesStream(strategyData: Record<string, any>): AsyncIterator<CopyStreamEvent> {
    yield { event: 'lifecycle', phase: 'Connecting to mock model...' };
    await sleep(300);

    yield { event: 'lifecycle', phase: 'Agent loop initialized' };
    await sleep(200);

    yield { event: 'lifecycle', phase: 'Processing strategy data...' };
    await sleep(300);

    const thinkingChunks = [
      'Analyzing brand strategy for ',
      strategyData.brand_name || 'your brand',
      '... ',
      'Identifying key content pillars... ',
      'Crafting platform-specific copies for Twitter/X... ',
      'Generating Instagram variations... ',
      'Building LinkedIn thought leadership angles... ',
      'Creating Facebook community-focused content... ',
      'Finalizing 28 copy variations with hashtags...',
    ];
    for (const chunk of thinkingChunks) {
      yield { event: 'thinking', text: chunk };
      await sleep(400);
    }

    const output = await this.generateCopies(strategyData);
    yield {
      event: 'result',
      copies: output.copies.map((c) => ({ text: c.text, platform: c.platform, hashtags: c.hashtags })),
    };
  }

  async chatRefine(
    copyText: string,
    platform: string,
    hashtags: string[],
    _strategyData: Record<string, any>,
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
