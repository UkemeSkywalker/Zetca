/**
 * Talk to Zetca: what Zetca learns about a brand from the user's message,
 * their website and the public web.
 */

import { z } from 'zod';

const HEX = /^#[0-9a-f]{6}$/i;

export const BrandProfileSchema = z.object({
  brandName: z.string().describe('The brand or business name, as the brand writes it'),
  summary: z.string().describe('What the business does, in 1-2 plain sentences a customer would understand'),
  offerings: z.array(z.string()).max(8).describe('Main products or services, a few words each'),
  location: z.string().optional().describe('City and country they serve, if known; omit if unknown'),
  audience: z.string().describe('Who buys from them and why, in 1-2 sentences'),
  voice: z.string().describe('How the brand sounds in its own words (e.g. "warm, playful, a little cheeky"), in one sentence'),
  goals: z.array(z.string()).max(5).describe('What the user said they want to achieve, in their terms; infer only from their message'),
  strengths: z.array(z.string()).max(5).describe('What makes them stand out, only from what was found'),
  facts: z
    .array(
      z.object({
        text: z.string().describe('One short finding about the brand'),
        source: z.string().describe('The URL it came from, or "your message"'),
      })
    )
    .max(10)
    .describe('The most useful findings, each with where it came from. Never include anything without a source.'),
  brandKit: z.object({
    logoUrl: z.string().optional().describe('The best logo from the candidates given, exactly as given; omit if none looks like a logo'),
    colors: z
      .array(
        z.object({
          hex: z.string().regex(HEX).describe('A 6-digit hex colour from the candidates given'),
          role: z.enum(['primary', 'secondary', 'accent', 'background', 'text']),
          name: z.string().describe('A plain colour name, e.g. "Cocoa brown"'),
        })
      )
      .max(5)
      .describe('2-5 brand colours chosen from the candidate colours (skip ones that look like plugin or default theme colours)'),
    headingFont: z.string().optional().describe('The font used for headings, from the candidates; omit if unknown'),
    bodyFont: z.string().optional().describe('The font used for body text, from the candidates; omit if unknown'),
    look: z.string().describe('How their visuals look, in one sentence (e.g. "warm close-up food photos, cream backgrounds, serif headlines")'),
  }),
  missing: z.array(z.string()).max(3).describe('Up to 3 short questions to ask the user about things you could not find and that matter for their plan'),
});
export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const ResearchStartSchema = z.object({
  message: z.string().trim().min(3, 'Tell Zetca a little about your business').max(4000),
});

export type ResearchStepId = 'links' | 'website' | 'web' | 'profile';
export type StepStatus = 'waiting' | 'working' | 'done' | 'skipped' | 'failed';

export interface ResearchStep {
  id: ResearchStepId;
  label: string;
  status: StepStatus;
  detail?: string;
}

/** Something found along the way, shown as it arrives */
export interface Finding {
  kind: 'site' | 'social' | 'web';
  title: string;
  text: string;
  source: string;
}

export interface BrandResearch {
  researchId: string;
  userId: string;
  message: string;
  status: 'working' | 'done' | 'failed';
  steps: ResearchStep[];
  findings: Finding[];
  /** Social profiles found (from the message or the website) */
  socials: Partial<Record<'instagram' | 'tiktok' | 'linkedin' | 'x' | 'facebook' | 'youtube', string>>;
  profile?: BrandProfile;
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
