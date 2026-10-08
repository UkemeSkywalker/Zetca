/**
 * Pure helpers for channel descriptions (kept free of the Strands SDK so they
 * can be unit tested and shared).
 */

import type { ChannelDescription } from '../models/strategy';

/** Length of the description as shown: the five parts joined with spaces */
export function descriptionLength(d: ChannelDescription): number {
  return [d.hook, d.audience, d.content, d.value, d.cta].map((p) => p.trim()).filter(Boolean).join(' ').length;
}

/**
 * Last-resort trim so a description can never exceed its limit: drop the least
 * essential parts first, then cut the remaining text at a word boundary.
 */
export function fitToLimit(d: ChannelDescription, limit: number): ChannelDescription {
  const fitted = { ...d };
  for (const part of ['content', 'value', 'audience'] as const) {
    if (descriptionLength(fitted) <= limit) return fitted;
    fitted[part] = '';
  }
  for (const part of ['cta', 'hook'] as const) {
    const over = descriptionLength(fitted) - limit;
    if (over <= 0) return fitted;
    const text = fitted[part];
    const cut = text.slice(0, Math.max(0, text.length - over - 1));
    fitted[part] = cut.length > 0 ? cut.replace(/\s+\S*$/, '').trim() + '…' : '';
  }
  return descriptionLength(fitted) <= limit ? fitted : { ...fitted, hook: fitted.hook.slice(0, limit) };
}
