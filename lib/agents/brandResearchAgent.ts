/**
 * Brand Research Agent: turns what was read about a brand (the user's
 * message, their website, public search results) into a brand profile and
 * brand kit. Strands Agents SDK with Amazon Bedrock, using structured output.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import {
  BrandAdjustmentSchema,
  BrandProfileSchema,
  type BrandAdjustment,
  ComparisonSchema,
  CompetitorPicksSchema,
  type BrandProfile,
  type Comparison,
  type CompetitorPicks,
} from '../models/brandResearch';
import {
  comparePrompt,
  keepCandidates,
  picksPrompt,
  researchPrompt,
  type BrandResearchInput,
  type CompetitorMaterial,
  type SearchResult,
} from '../research/brandProfile';
import { adjustPrompt } from '../research/brandEdit';
import type { BrandResearch } from '../models/brandResearch';
import { StructuredOutputException } from './errors';
import { runAgent, STRUCTURED_OUTPUT_ONLY } from './runAgent';
import type { AgentCredentials } from './strategistAgent';

const SYSTEM_PROMPT = `You are a sharp brand strategist doing homework on a small business before planning its social media.

You get: what the owner told you, pages from their website, and public web search results. Build an honest brand profile and brand kit.

Rules:
1. Use only what's in the material. Never invent prices, numbers, awards, locations or claims. If something isn't there, leave it out or ask about it in "missing".
2. Every fact needs a source: the page URL it came from, or "your message".
3. Search results can be about other businesses with similar names. Only use a result if it is clearly about this brand (same name and same place or website).
4. Brand kit: pick colours, fonts and the logo only from the candidates given. Website builders add plugin colours (bright blue, purple, teal) that aren't the brand's; skip those. Prefer colours that appear in the logo or the site's main design.
5. Write plainly, like you'd talk to the owner. No marketing jargon. Keep to the word limits: the page shows tags and short labels, not paragraphs.
6. Write in the language of the owner's message.

${STRUCTURED_OUTPUT_ONLY}`;

const PICK_PROMPT = `You find a small business's real competitors from web search results.

Rules:
1. Pick businesses that sell the same kind of thing to the same kind of customer, in the same city when possible.
2. Only real, individual businesses named in the results. Never directories, "top 10" lists, marketplaces, news sites or the user's own brand.
3. Use only URLs that appear in the results. Their own website goes in "website"; a social profile goes in "social".
4. Fewer is fine: return only clear matches.

${STRUCTURED_OUTPUT_ONLY}`;

const COMPARE_PROMPT = `You compare a small business with similar brands to find what works and where the user can win.

Rules:
1. Use only what's in the material. Never invent follower counts, posting frequency, prices or results.
2. Tags and short lines only, within the word limits. No paragraphs.
3. "whatWorks" must be tactics the user could copy, each tied to the competitor and URL that shows it.
4. Write in plain words a business owner would use.

${STRUCTURED_OUTPUT_ONLY}`;

const ADJUST_PROMPT = `You help a small business owner fine-tune the brand result you made for them: name, tagline, specialties, customers, how they sound, their look, colours, fonts and positioning.

Each message asks for a change, answers one of your quick questions, or asks you something.

Rules:
1. Change only what the message asks for, or what its answer clearly affects. Put only those fields in "changes" and leave every other field out. Never redo the whole result.
2. A list you change is sent whole: the full new list, keeping the items the user didn't ask to drop.
3. The result shown to you includes the user's own edits. Keep them unless the message asks to change them.
4. Colours: 6-digit hex codes, 2-5 colours, each with a role and a plain 1-2 word name. "Warmer", "softer", "bolder" and so on mean new hex values in that direction, keeping the palette's roles.
5. Fonts: real Google Fonts family names only.
6. If they answer a quick question, use the answer (e.g. update customers) and drop that question from "missing".
7. If the message is a question or too unclear to act on, change nothing and answer or ask in "reply".
8. "reply" is 1-2 short, plain sentences saying what you changed. No jargon. Write in the language of the user's message.

${STRUCTURED_OUTPUT_ONLY}`;

export class BrandResearchAgent {
  private model: BedrockModel;

  constructor({ awsRegion, modelId = 'us.anthropic.claude-sonnet-4-6', awsAccessKeyId, awsSecretAccessKey }: AgentCredentials) {
    this.model = new BedrockModel({
      modelId,
      region: awsRegion,
      requestTimeout: 120_000,
      clientConfig: {
        maxAttempts: 2,
        ...(awsAccessKeyId && awsSecretAccessKey ? { credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } } : {}),
      },
    });
  }

  async profile(input: BrandResearchInput): Promise<BrandProfile> {
    const run = () =>
      runAgent(new Agent({ model: this.model, systemPrompt: SYSTEM_PROMPT, structuredOutputSchema: BrandProfileSchema }), 'brand-research', researchPrompt(input));
    // Bedrock sometimes drops a stream part-way; one retry covers it
    const result = await run().catch((error: Error) => {
      if (error?.name !== 'ModelError') throw error;
      return run();
    });
    if (!result.structuredOutput) throw new StructuredOutputException('Brand research failed to return structured output');
    return keepCandidates(result.structuredOutput as BrandProfile, input);
  }

  async pickCompetitors(profile: BrandProfile, results: SearchResult[], ownSite?: string): Promise<CompetitorPicks> {
    return this.structured<CompetitorPicks>(PICK_PROMPT, CompetitorPicksSchema, 'competitor-picks', picksPrompt(profile, results, ownSite));
  }

  async compare(profile: BrandProfile, competitors: CompetitorMaterial[]): Promise<Comparison> {
    return this.structured<Comparison>(COMPARE_PROMPT, ComparisonSchema, 'competitor-compare', comparePrompt(profile, competitors));
  }

  /** Changes parts of an existing result from a chat message */
  async adjust(research: Omit<BrandResearch, 'userId'>, message: string): Promise<BrandAdjustment> {
    return this.structured<BrandAdjustment>(ADJUST_PROMPT, BrandAdjustmentSchema, 'brand-adjust', adjustPrompt(research, message));
  }

  private async structured<T>(
    systemPrompt: string,
    schema: typeof CompetitorPicksSchema | typeof ComparisonSchema | typeof BrandAdjustmentSchema,
    label: string,
    prompt: string
  ): Promise<T> {
    const run = () => runAgent(new Agent({ model: this.model, systemPrompt, structuredOutputSchema: schema }), label, prompt);
    const result = await run().catch((error: Error) => {
      if (error?.name !== 'ModelError') throw error;
      return run();
    });
    if (!result.structuredOutput) throw new StructuredOutputException(`${label} failed to return structured output`);
    return result.structuredOutput as T;
  }
}

/** For development without Bedrock */
export class MockBrandResearchAgent {
  async profile(input: BrandResearchInput): Promise<BrandProfile> {
    await new Promise((r) => setTimeout(r, 800));
    const home = input.pages[0];
    return {
      brandName: home?.title.split(/[-|–]/)[0].trim() || 'Your brand',
      tagline: (home?.description || input.message).slice(0, 60),
      category: 'small business',
      offerings: home?.headings.slice(0, 3) ?? [],
      audience: ['Local customers'],
      voice: ['Friendly', 'Clear'],
      goals: [input.message.slice(0, 50)],
      strengths: [],
      facts: home ? [{ text: home.description || home.title, source: home.url }] : [{ text: input.message.slice(0, 80), source: 'your message' }],
      brandKit: {
        logoUrl: home?.logos[0],
        colors: (home?.colors ?? []).slice(0, 3).map((hex, i) => ({ hex, role: (['primary', 'secondary', 'accent'] as const)[i], name: hex })),
        headingFont: home?.fonts[0],
        bodyFont: home?.fonts[1],
        look: ['Clean photos'],
      },
      missing: ['What do you most want people to do after a post?'],
      styles: [{ id: 'marble-thinker', why: 'Bold and simple' }],
    };
  }

  async pickCompetitors(_profile: BrandProfile, results: SearchResult[]): Promise<CompetitorPicks> {
    return { competitors: results.slice(0, 2).map((r) => ({ name: r.title.split(/[-|–]/)[0].trim(), website: r.url, why: 'Similar business' })) };
  }

  /** Understands a few requests, so the chat can be tried without Bedrock */
  async adjust(research: Omit<BrandResearch, 'userId'>, message: string): Promise<BrandAdjustment> {
    await new Promise((r) => setTimeout(r, 400));
    const kit = research.profile?.brandKit;
    if (/warm/i.test(message) && kit?.colors.length) {
      const warm = ['#B5532F', '#E0A526', '#F4E1C1', '#5A2E1B', '#D97B4A'];
      return { reply: 'I warmed up your colours.', changes: { colors: kit.colors.map((c, i) => ({ ...c, hex: warm[i % warm.length] })) } };
    }
    if (/font/i.test(message)) return { reply: 'I switched your heading font to Fraunces.', changes: { headingFont: 'Fraunces' } };
    return { reply: 'Noted. Tell me which part to change.', changes: {} };
  }

  async compare(_profile: BrandProfile, competitors: CompetitorMaterial[]): Promise<Comparison> {
    return {
      competitors: competitors.map((c) => ({ name: c.name, positioning: c.why, contentStyle: ['Photos'], offers: [] })),
      whatWorks: [],
      gap: 'Post more often than they do.',
      positioning: 'The local favourite',
    };
  }
}
