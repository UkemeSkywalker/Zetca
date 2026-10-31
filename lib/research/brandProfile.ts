/**
 * The brand research prompt, and the check that keeps the brand kit to what
 * was actually found on the brand's website.
 */

import type { BrandProfile } from '../models/brandResearch';
import type { PageRead } from './webReader';
import type { SearchResult } from './webSearch';
export type { SearchResult };

export interface BrandResearchInput {
  message: string;
  pages: PageRead[];
  socialPages: PageRead[];
  search: SearchResult[];
}

const pageBlock = (p: PageRead) =>
  [
    `URL: ${p.url}`,
    p.title && `Title: ${p.title}`,
    p.description && `Description: ${p.description}`,
    p.headings.length && `Headings: ${p.headings.slice(0, 12).join(' | ')}`,
    p.text && `Text: ${p.text.slice(0, 3500)}`,
  ]
    .filter(Boolean)
    .join('\n');

export function researchPrompt({ message, pages, socialPages, search }: BrandResearchInput): string {
  const home = pages[0];
  const candidates = home
    ? `Logo candidates (choose one, exactly as written, or none):\n${home.logos.map((l) => `- ${l}`).join('\n') || '- none'}
Colour candidates, most used first:\n${home.colors.join(', ') || 'none'}
Font candidates, most used first:\n${home.fonts.join(', ') || 'none'}`
    : 'No website was read, so leave the logo, colours and fonts out unless the search results show them.';

  return `What the owner told you:
"""${message}"""

Website pages:
${pages.map(pageBlock).join('\n\n---\n\n') || 'None (no website link, or it could not be read).'}

Their public social profiles:
${socialPages.map(pageBlock).join('\n\n---\n\n') || 'None read.'}

Public web search results:
${search.map((r) => `- ${r.title} (${r.url}): ${r.content}`).join('\n') || 'None.'}

Brand kit candidates from their website:
${candidates}

Build the brand profile.`;
}

/** The brand kit may only use what was found: drops a logo, colour or font the model made up */
export function keepCandidates(profile: BrandProfile, { pages }: BrandResearchInput): BrandProfile {
  const home = pages[0];
  const logos = new Set(home?.logos ?? []);
  const colors = new Set((home?.colors ?? []).map((c) => c.toLowerCase()));
  const fonts = new Set(home?.fonts ?? []);
  const kit = profile.brandKit;
  return {
    ...profile,
    brandKit: {
      ...kit,
      logoUrl: kit.logoUrl && logos.has(kit.logoUrl) ? kit.logoUrl : undefined,
      colors: kit.colors.filter((c) => colors.has(c.hex.toLowerCase())).map((c) => ({ ...c, hex: c.hex.toLowerCase() })),
      headingFont: kit.headingFont && fonts.has(kit.headingFont) ? kit.headingFont : undefined,
      bodyFont: kit.bodyFont && fonts.has(kit.bodyFont) ? kit.bodyFont : undefined,
    },
  };
}


/** The brand, briefly, for the competitor prompts */
const brandLine = (p: BrandProfile) =>
  `${p.brandName}: ${p.tagline}. Category: ${p.category}.${p.location ? ` Location: ${p.location}.` : ''} Sells: ${p.offerings.join(', ')}. Customers: ${p.audience.join(', ')}.`;

export function picksPrompt(profile: BrandProfile, results: SearchResult[], ownSite?: string): string {
  return `The user's brand:
${brandLine(profile)}${ownSite ? `\nTheir website (not a competitor): ${ownSite}` : ''}

Search results for similar businesses:
${results.map((r) => `- ${r.title} (${r.url}): ${r.content}`).join('\n') || 'None.'}

Pick up to 3 comparable businesses from these results.`;
}

export interface CompetitorMaterial {
  name: string;
  why: string;
  pages: PageRead[];
  search: SearchResult[];
}

export function comparePrompt(profile: BrandProfile, competitors: CompetitorMaterial[]): string {
  const block = (c: CompetitorMaterial) =>
    [
      `## ${c.name} (${c.why})`,
      ...c.pages.map((p) => `Website ${p.url}\nTitle: ${p.title}\nDescription: ${p.description}\nHeadings: ${p.headings.slice(0, 10).join(' | ')}\nText: ${p.text.slice(0, 1800)}`),
      ...c.search.map((r) => `- ${r.title} (${r.url}): ${r.content}`),
    ].join('\n');
  return `The user's brand:
${brandLine(profile)}
Strengths: ${profile.strengths.join(', ') || 'unknown'}. Goals: ${profile.goals.join('; ') || 'unknown'}.

Similar brands and what is public about them:
${competitors.map(block).join('\n\n')}

Compare them with the user's brand.`;
}
