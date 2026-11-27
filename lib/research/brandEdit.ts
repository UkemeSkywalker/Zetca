/**
 * Changing the brand result after the research: by hand on the page, or by
 * asking in the chat. Both go through applyBrandEdit, so the page can show a
 * hand edit straight away with the same logic the server saves it with.
 *
 * Only type imports here: this runs in the browser too.
 */

import type { BrandEdit, BrandEditField, BrandResearch, ChatTurn } from '../models/brandResearch';

type Research = Omit<BrandResearch, 'userId'> & { userId?: string };

/** What each part is called on the page */
export const FIELD_LABELS: Record<BrandEditField, string> = {
  brandName: 'name',
  tagline: 'tagline',
  specialties: 'specialties',
  audience: 'customers',
  voice: 'how you sound',
  look: 'your look',
  colors: 'colours',
  headingFont: 'heading font',
  bodyFont: 'body font',
  positioning: 'positioning',
  missing: 'quick questions',
};

/** How many past chat lines the agent sees */
export const CHAT_MEMORY = 12;

/** The parts of the result that can be changed, as they are now */
export function brandSnapshot(r: Research): Required<{ [K in BrandEditField]: Exclude<BrandEdit[K], undefined> }> | null {
  const p = r.profile;
  if (!p) return null;
  return {
    brandName: p.brandName,
    tagline: p.tagline,
    specialties: r.chips,
    audience: p.audience,
    voice: p.voice,
    look: p.brandKit.look,
    colors: p.brandKit.colors,
    headingFont: p.brandKit.headingFont ?? null,
    bodyFont: p.brandKit.bodyFont ?? null,
    positioning: r.comparison?.positioning ?? '',
    missing: p.missing,
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Applies a change to the result; returns the new result and the parts that really changed */
export function applyBrandEdit<R extends Research>(r: R, edit: BrandEdit): { research: R; changed: BrandEditField[] } {
  const before = brandSnapshot(r);
  if (!before || !r.profile) return { research: r, changed: [] };
  const changed = (Object.keys(edit) as BrandEditField[]).filter((f) => edit[f] !== undefined && !same(edit[f], before[f]));
  if (!changed.length) return { research: r, changed };

  const e = edit;
  const p = r.profile;
  const kit = { ...p.brandKit };
  if (changed.includes('colors')) kit.colors = e.colors!;
  if (changed.includes('look')) kit.look = e.look!;
  for (const f of ['headingFont', 'bodyFont'] as const) {
    if (!changed.includes(f)) continue;
    if (e[f]) kit[f] = e[f]!;
    else delete kit[f];
  }

  const profile = {
    ...p,
    brandKit: kit,
    ...(changed.includes('brandName') && { brandName: e.brandName! }),
    ...(changed.includes('tagline') && { tagline: e.tagline! }),
    ...(changed.includes('audience') && { audience: e.audience! }),
    ...(changed.includes('voice') && { voice: e.voice! }),
    ...(changed.includes('missing') && { missing: e.missing! }),
    // The tags under the tagline are the offerings plus the location
    ...(changed.includes('specialties') && { offerings: e.specialties!.filter((s) => s !== p.location) }),
  };

  const research: R = {
    ...r,
    profile,
    ...(changed.includes('specialties') && { chips: e.specialties! }),
    ...(changed.includes('positioning') && { comparison: { whatWorks: [], gap: '', ...r.comparison, positioning: e.positioning! } }),
  };
  return { research, changed };
}

/** Notes a hand edit in the conversation, folding it into the note before it if that was also a hand edit */
export function noteHandEdit(chat: ChatTurn[] = [], changed: BrandEditField[], at: string): ChatTurn[] {
  if (!changed.length) return chat;
  const last = chat.at(-1);
  const fields = last?.role === 'edit' ? [...new Set([...(last.changed ?? []), ...changed])] : changed;
  const note: ChatTurn = { role: 'edit', text: `You changed ${listOf(fields.map((f) => FIELD_LABELS[f]))} by hand`, changed: fields, at };
  return last?.role === 'edit' ? [...chat.slice(0, -1), note] : [...chat, note];
}

/** "a, b and c" */
export const listOf = (items: string[]) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** What the chat agent is given: the result as it is now (with hand edits), the conversation so far and the new message */
export function adjustPrompt(r: Research, message: string): string {
  const snapshot = brandSnapshot(r);
  const history = (r.chat ?? [])
    .slice(-CHAT_MEMORY)
    .map((t) => (t.role === 'user' ? `User: ${t.text}` : t.role === 'zetca' ? `You: ${t.text}` : `(${t.text})`))
    .join('\n');
  return `The user's first message, which the research was based on:
"""${r.message}"""

${r.profile?.category ? `Kind of business: ${r.profile.category}${r.profile.location ? `, ${r.profile.location}` : ''}\n\n` : ''}The brand result as it is now (including any changes the user made by hand; treat those as what the user wants):
${JSON.stringify(snapshot, null, 2)}

The conversation so far:
${history || '(none yet)'}

The user's new message:
"""${message}"""`;
}
