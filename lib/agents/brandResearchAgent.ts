/**
 * Brand Research Agent: turns what was read about a brand (the user's
 * message, their website, public search results) into a brand profile and
 * brand kit. Strands Agents SDK with Amazon Bedrock, using structured output.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import {
  BrandProfileSchema,
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

  private async structured<T>(systemPrompt: string, schema: typeof CompetitorPicksSchema | typeof ComparisonSchema, label: string, prompt: string): Promise<T> {
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
    };
  }

  async pickCompetitors(_profile: BrandProfile, results: SearchResult[]): Promise<CompetitorPicks> {
    return { competitors: results.slice(0, 2).map((r) => ({ name: r.title.split(/[-|–]/)[0].trim(), website: r.url, why: 'Similar business' })) };
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
