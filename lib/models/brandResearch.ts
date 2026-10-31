/**
 * Talk to Zetca: what Zetca learns about a brand from the user's message,
 * their website and the public web, and how it compares with similar brands.
 *
 * The page shows this visually (photos, swatches, chips), so the AI writes
 * short labels and tags, never paragraphs.
 */

import { z } from 'zod';

const HEX = /^#[0-9a-f]{6}$/i;
const tags = (what: string, max = 4) => z.array(z.string()).max(max).describe(`${what}: ${max} or fewer tags of 1-3 words each`);

export const BrandProfileSchema = z.object({
  brandName: z.string().describe('The brand or business name, as the brand writes it'),
  tagline: z.string().describe('What they do in 10 words or fewer, like a profile bio line (e.g. "Celebration cakes, baked fresh in Lekki")'),
  category: z.string().describe('The kind of business in 1-3 words, for finding similar brands (e.g. "custom cake bakery")'),
  location: z.string().optional().describe('City and country they serve, if known; omit if unknown'),
  offerings: tags('Main products or services', 6),
  audience: tags('Who buys from them (e.g. "Young families", "Couples", "Party planners")', 3),
  voice: tags('How the brand sounds, as single words (e.g. "Warm", "Playful", "Proud")', 3),
  goals: z.array(z.string()).max(3).describe('What the user said they want, each in 8 words or fewer; only from their message'),
  strengths: tags('What makes them stand out, only from what was found', 3),
  facts: z
    .array(
      z.object({
        text: z.string().describe('One finding in 12 words or fewer'),
        source: z.string().describe('The URL it came from, or "your message"'),
      })
    )
    .max(5)
    .describe('The 3-5 most useful findings, each with where it came from. Never include anything without a source.'),
  brandKit: z.object({
    logoUrl: z.string().optional().describe('The best logo from the candidates given, exactly as given; omit if none looks like a logo'),
    colors: z
      .array(
        z.object({
          hex: z.string().regex(HEX).describe('A 6-digit hex colour from the candidates given'),
          role: z.enum(['primary', 'secondary', 'accent', 'background', 'text']),
          name: z.string().describe('A plain 1-2 word colour name, e.g. "Cocoa"'),
        })
      )
      .max(5)
      .describe('2-5 brand colours chosen from the candidate colours (skip ones that look like plugin or default theme colours)'),
    headingFont: z.string().optional().describe('The font used for headings, from the candidates; omit if unknown'),
    bodyFont: z.string().optional().describe('The font used for body text, from the candidates; omit if unknown'),
    look: tags('How their photos and designs look (e.g. "Warm light", "Close-ups", "Cream backgrounds")', 3),
  }),
  missing: z.array(z.string()).max(2).describe('Up to 2 short questions (15 words or fewer) about things you could not find that matter for their plan'),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

/** Similar brands picked from search results */
export const CompetitorPicksSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string().describe('The business name'),
        website: z.string().optional().describe('Their own website URL from the results, if one is there; never a directory, marketplace or social site'),
        social: z.string().optional().describe('Their Instagram, TikTok or other social profile URL from the results, if one is there'),
        why: z.string().describe('Why they are comparable, in 8 words or fewer'),
      })
    )
    .max(3)
    .describe('Up to 3 real businesses that sell the same kind of thing to the same kind of customer, ideally in the same city. Not the user’s own brand. Not directories, listicles or marketplaces.'),
});
export type CompetitorPicks = z.infer<typeof CompetitorPicksSchema>;

export const ComparisonSchema = z.object({
  competitors: z
    .array(
      z.object({
        name: z.string().describe('Exactly as given'),
        positioning: z.string().describe('How they position themselves, 8 words or fewer'),
        contentStyle: tags('What their content and visuals are like (e.g. "Behind the scenes", "Luxury close-ups")', 3),
        offers: tags('Notable offers or hooks they use (e.g. "Same-day delivery", "Free tasting")', 3),
      })
    )
    .max(3),
  whatWorks: z
    .array(
      z.object({
        title: z.string().describe('The tactic in 5 words or fewer (e.g. "Behind-the-scenes videos")'),
        detail: z.string().describe('One line, 15 words or fewer, on why it works for them'),
        competitor: z.string().describe('Which competitor does it, exactly as given'),
        source: z.string().describe('The URL that shows it'),
      })
    )
    .max(3)
    .describe('Up to 3 tactics the competitors use that the user could use too; only what the material shows'),
  gap: z.string().describe('The biggest opportunity for the user versus these brands, in 15 words or fewer'),
  positioning: z.string().describe('How the user should position their brand, as a 10-word-or-fewer statement (e.g. "Lagos’s go-to bakery for celebration cakes")'),
});
export type Comparison = z.infer<typeof ComparisonSchema>;

export const ResearchStartSchema = z.object({
  message: z.string().trim().min(3, 'Tell Zetca a little about your business').max(4000),
});

export type ResearchStepId = 'website' | 'web' | 'profile' | 'competitors' | 'compare';
export type StepStatus = 'waiting' | 'working' | 'done' | 'skipped' | 'failed';

export interface ResearchStep {
  id: ResearchStepId;
  label: string;
  status: StepStatus;
  detail?: string;
}

export type Socials = Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'x' | 'facebook' | 'youtube', string>>;

export interface MediaImage {
  url: string;
  /** Where it was found (a page URL) */
  source: string;
  caption?: string;
}

export interface MediaVideo {
  url: string;
  platform: 'youtube' | 'vimeo' | 'tiktok' | 'instagram' | 'file';
  thumbnail?: string;
  source: string;
}

export interface Media {
  images: MediaImage[];
  videos: MediaVideo[];
}

/** A similar brand, with what could be found about it */
export interface CompetitorFound {
  name: string;
  why: string;
  website?: string;
  socials: Socials;
  logoUrl?: string;
  colors: string[];
  media: Media;
  /** Filled in by the comparison */
  positioning?: string;
  contentStyle?: string[];
  offers?: string[];
}

export interface BrandResearch {
  researchId: string;
  userId: string;
  message: string;
  status: 'working' | 'done' | 'failed';
  steps: ResearchStep[];
  /** Social profiles found (from the message, the website or search) */
  socials: Socials;
  /** Photos and videos of the brand, shown as they're found */
  media: Media;
  /** Short things found early, shown as chips while the rest runs */
  chips: string[];
  profile?: BrandProfile;
  competitors: CompetitorFound[];
  comparison?: Omit<Comparison, 'competitors'>;
  error?: string;
  cost: number;
  createdAt: string;
  updatedAt: string;
}

export type PublicBrandResearch = Omit<BrandResearch, 'userId'>;
export function toPublicResearch(r: BrandResearch): PublicBrandResearch {
  const { userId, ...rest } = r;
  void userId;
  return rest;
}
