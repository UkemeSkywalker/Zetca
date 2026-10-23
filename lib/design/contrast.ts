/**
 * Colour contrast for designs: text must always stand out from what's behind it.
 * Uses the WCAG 2 formula, where 4.5:1 is the minimum for normal text.
 */

export const MIN_CONTRAST = 4.5;

/** "#1a2" or "#11aa22" → [r, g, b] (0–255); unknown values read as black */
export function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** Relative luminance, 0 (black) to 1 (white) */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two colours, 1 to 21 */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A colour seen through a see-through layer of `top` at `opacity` (0–1) */
export function blend(bottom: string, top: string, opacity: number): string {
  const b = parseHex(bottom);
  const t = parseHex(top);
  return toHex([0, 1, 2].map((i) => b[i] * (1 - opacity) + t[i] * opacity) as [number, number, number]);
}

/** The lowest contrast of `text` against any of the background colours (e.g. both ends of a gradient) */
export function worstContrast(text: string, backgrounds: string[]): number {
  return Math.min(...backgrounds.map((bg) => contrastRatio(text, bg)));
}

/** Of `candidates`, the one that contrasts best with every background colour */
export function bestTextColor(backgrounds: string[], candidates: string[] = ['#FFFFFF', '#0B0B0F']): string {
  return candidates.reduce((best, c) => (worstContrast(c, backgrounds) > worstContrast(best, backgrounds) ? c : best));
}

export function passes(text: string, backgrounds: string[]): boolean {
  return worstContrast(text, backgrounds) >= MIN_CONTRAST;
}
