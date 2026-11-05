/**
 * What a style recipe is made of, and the small pieces recipes are built
 * from: text boxes, pills, bubbles, strips. Shared by the original styles
 * (recipes.ts) and the style families (families.ts).
 */

import type { KeyColor } from '../media/chromaKey';
import { bestTextColor, blend, contrastRatio } from './contrast';
import { FORMATS, type DesignDoc, type FormatId, type ImageLayer, type PhotoBackground, type ShapeLayer, type TextLayer } from './types';

export type RecipeFamily = 'series' | 'editorial' | 'cutout' | 'mono' | 'giant-word' | 'premium' | 'celebration' | 'big-idea' | 'flyer';

export const FAMILY_NAMES: Record<RecipeFamily, string> = {
  series: 'Brand series',
  editorial: 'Editorial',
  cutout: 'Cutout on colour',
  mono: 'One-colour hero',
  'giant-word': 'Giant word',
  premium: 'Premium product',
  celebration: 'Campaign and celebration',
  'big-idea': 'Big idea',
  flyer: 'Highlight and flyer',
};

/** The words a recipe places */
export interface RecipeText {
  /**
   * The main words (for giant-word styles, the first word is the giant one).
   * Styles with accent words read `*these words*` as the accent and
   * `~~this word~~` as crossed out.
   */
  headline: string;
  /** A short label, e.g. a hashtag or "NEW ERA" */
  kicker?: string;
  /** A supporting line */
  body?: string;
  /** The brand's name or handle */
  footer?: string;
  /** The button ("Speak to us", "Sign up", "Shop now") */
  cta?: string;
}

/** A brand's colours, when a campaign uses "My brand" instead of the style's own */
export interface RecipeColors {
  /** The flat colour or main colour of the style */
  main: string;
  /** Text and accents */
  ink?: string;
  accent?: string;
}

export type Colors = Required<RecipeColors>;

export interface BuildInput {
  text: RecipeText;
  format: FormatId;
  photo: PhotoBackground;
  cutout?: { photoId: string; width: number; height: number };
  colors: Colors;
}

/** One way a style lays a post out: where the subject sits and where the words go */
export interface RecipeLayout {
  id: string;
  name: string;
  /** The AI image prompt for one post: `idea` is what the post is about */
  imagePrompt(idea: string, colors: Colors): string;
  build(input: BuildInput): DesignDoc;
  /** Example words for the gallery */
  example: RecipeText;
  /** This layout's own colours, when it uses the style's colours (pastel posts each in their own) */
  colors?: Colors;
  /** Cut the subject out of this flat colour, so the page colour can change */
  cutout?: KeyColor;
  /** Drawn entirely by Zetca: no AI image needed */
  noImage?: boolean;
}

export interface StyleRecipe {
  id: string;
  name: string;
  family: RecipeFamily;
  description: string;
  /** The style's own colours */
  colors: Colors;
  /** Make the image, then cut the subject out of this flat colour (giant-word styles) */
  cutout?: KeyColor;
  /** The AI image prompt for one post: `idea` is what the post is about */
  imagePrompt(idea: string, colors: Colors): string;
  /** The finished design from the AI image (and its cut-out, when the recipe makes one) */
  build(input: BuildInput): DesignDoc;
  /** Example words for the gallery */
  example: RecipeText;
  /** Styles with several layouts that share one look (a family); the first is the main one */
  layouts?: RecipeLayout[];
  /** How the words should be written for this style (sent to the words writer) */
  wordsHint?: string;
}

export const M = 84;
export const W = 1080;

export function text(partial: Partial<TextLayer> & Pick<TextLayer, 'id' | 'role' | 'text' | 'x' | 'y' | 'width' | 'height'>): TextLayer {
  const layer: TextLayer = { font: 'jakarta', weight: 800, size: 40, color: '#FFFFFF', align: 'left', valign: 'top', lineHeight: 1.05, uppercase: false, letterSpacing: 0, ...partial };
  // Short formats (a YouTube thumbnail) squeeze boxes; the text shrinks to fit instead
  return { ...layer, width: Math.max(40, layer.width), height: Math.max(20, layer.height) };
}

export const NO_TEXT = 'Absolutely no text, letters, numbers, logos, brand names or watermarks anywhere in the image.';

export const heightOf = (format: FormatId) => FORMATS[format].height;

/** The first word, for the giant word (letters and digits only) */
export const giantWord = (headline: string) => (headline.trim().split(/\s+/)[0] ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 8) || 'NOW';
/** The rest of the headline after the giant word */
export const afterGiant = (headline: string) => headline.trim().split(/\s+/).slice(1).join(' ');

/** Merges brand colours over the style's own, keeping text readable */
export function mergeColors(own: Colors, brand?: RecipeColors): Colors {
  if (!brand) return own;
  const main = brand.main;
  const ink = brand.ink && bestTextColor([main], [brand.ink, '#0B0B0F', '#FFFFFF']) === brand.ink ? brand.ink : bestTextColor([main], ['#0B0B0F', '#FFFFFF']);
  return { main, ink, accent: brand.accent ?? own.accent };
}

/** The same three colours */
export const sameColors = (a: RecipeColors, b: RecipeColors) =>
  a.main.toLowerCase() === b.main.toLowerCase() && (a.ink ?? '').toLowerCase() === (b.ink ?? '').toLowerCase() && (a.accent ?? '').toLowerCase() === (b.accent ?? '').toLowerCase();

/** A lighter version of a colour (towards white) */
export const lighten = (c: string, amount: number) => blend(c, '#FFFFFF', amount);
/** A darker version of a colour */
export const darken = (c: string, amount: number) => blend(c, '#000000', amount);

/** `want` if it reads on `bg`, else black or white */
export const readable = (want: string, bg: string, min = 3) => (contrastRatio(want, bg) >= min ? want : bestTextColor([bg], ['#FFFFFF', '#0B0B0F']));

/* Accent and crossed-out words */

export interface Markup {
  text: string;
  /** Word ranges, counted across the whole text */
  accent: [number, number][];
  strike: [number, number][];
}

/**
 * Reads `*accent words*` and `~~crossed out~~` out of the words, leaving
 * plain text and the word ranges they covered.
 */
export function markup(raw: string): Markup {
  const accent: [number, number][] = [];
  const strike: [number, number][] = [];
  let index = 0;
  let a: number | null = null;
  let s: number | null = null;
  const lines = raw.split('\n').map((line) =>
    line
      .split(/\s+/)
      .filter(Boolean)
      .map((original) => {
        let w = original;
        if (w.startsWith('~~')) {
          s = index;
          w = w.slice(2);
        }
        if (w.startsWith('*')) {
          a = index;
          w = w.replace(/^\*+/, '');
        }
        // A closing marker, maybe followed by punctuation: "Drama*." or "pawns~~,"
        const closeS = w.match(/^(.*?)~~([^\p{L}\p{N}]*)$/u);
        if (closeS) {
          w = closeS[1] + closeS[2];
          if (s !== null) strike.push([s, index + 1]);
          s = null;
        }
        const closeA = w.match(/^(.*?)\*+([^\p{L}\p{N}*]*)$/u);
        if (closeA) {
          w = closeA[1] + closeA[2];
          if (a !== null) accent.push([a, index + 1]);
          a = null;
        }
        w = w.replace(/\*|~~/g, '');
        if (w) index++;
        return w;
      })
      .filter(Boolean)
      .join(' ')
  );
  if (a !== null && index > a) accent.push([a, index]);
  if (s !== null && index > s) strike.push([s, index]);
  return { text: lines.join('\n'), accent, strike };
}

/** Takes the markers out of words that aren't drawn with accents */
export const plain = (raw: string | undefined) => (raw === undefined ? undefined : markup(raw).text);

/** The last `n` words, as an accent range, for headlines written without markers */
function lastWords(t: string, n: number): [number, number][] {
  const count = t.split(/\s+/).filter(Boolean).length;
  return count > n + 1 ? [[count - n, count]] : [];
}

/**
 * A text layer whose accent words are drawn differently (and crossed-out
 * words struck through). With no markers, the last `fallback` words are the accent.
 */
export function rich(
  layer: Partial<TextLayer> & Pick<TextLayer, 'id' | 'role' | 'x' | 'y' | 'width' | 'height'>,
  raw: string,
  accent: { color?: string; italic?: boolean; bold?: boolean; strike?: string; fallback?: number }
): TextLayer {
  const m = markup(raw);
  const ranges = m.accent.length ? m.accent : lastWords(m.text, accent.fallback ?? 0);
  const marks: NonNullable<TextLayer['marks']> = [
    ...ranges.map(([from, to]) => ({ from, to, ...(accent.color ? { color: accent.color } : {}), ...(accent.italic ? { italic: true } : {}), ...(accent.bold ? { bold: true } : {}) })),
    ...(accent.strike ? m.strike.map(([from, to]) => ({ from, to, strike: accent.strike })) : []),
  ].slice(0, 4);
  return text({ ...layer, text: m.text, ...(marks.length ? { marks } : {}) });
}

/* Pieces */

/** A small line in a corner */
export const corner = (id: string, role: TextLayer['role'], value: string | undefined, where: 'tl' | 'tr' | 'bl' | 'br', h: number, color: string, size = 28) =>
  value
    ? [
        text({
          id,
          role,
          text: value,
          x: where.endsWith('l') ? M : W / 2,
          y: where.startsWith('t') ? M - 20 : h - M - 40,
          width: W / 2 - M,
          height: 50,
          size,
          weight: 700,
          color,
          align: where.endsWith('l') ? 'left' : 'right',
        }),
      ]
    : [];

/** A rounded button-like pill ("Shop now"), its text always readable on its fill */
export const pill = (id: string, value: string | undefined, x: number, y: number, fill: string, width = 360, size = 34, align: TextLayer['align'] = 'left') =>
  value
    ? [text({ id, role: 'pill', text: value, x, y, width, height: size * 2.2, size, weight: 800, fill, color: bestTextColor([fill], ['#0B0B0F', '#FFFFFF']), align })]
    : [];

/** A full-width bar along the bottom: the brand, its handle, phone or website */
export const contactBar = (value: string | undefined, h: number, fill: string) =>
  value ? [text({ id: 'footer', role: 'pill', text: value, x: M / 2, y: h - M - 70, width: W - M, height: 96, size: 30, weight: 700, fill, color: bestTextColor([fill], ['#0B0B0F', '#FFFFFF']), align: 'center' })] : [];

/** A row of up to 3 short features ("A16 chip · All-day battery · 11-inch screen") */
export const featureRow = (value: string | undefined, h: number, color: string) => {
  const parts = items(value, 3);
  const w = (W - M * 2) / Math.max(parts.length, 1);
  return parts.map((part, i) => text({ id: `feature${i}`, role: 'body', text: part, x: M + i * w, y: h - M - 70, width: w - 16, height: 70, size: 26, weight: 600, color, align: 'center', lineHeight: 1.2 }));
};

/** Short items from "A · B · C" */
export const items = (value: string | undefined, max: number) => (value ?? '').split(/\s*[·|•]\s*/).map((s) => s.trim()).filter(Boolean).slice(0, max);

export const photoBg = (photo: PhotoBackground) => ({ ...photo, focusX: 0.5, focusY: 0.5 });

/** The cut-out subject, lined up exactly with where it was in the photo */
export const cutoutLayer = (cutout: BuildInput['cutout'], h: number): ImageLayer[] =>
  cutout ? [{ id: 'subject', photoId: cutout.photoId, width: cutout.width, height: cutout.height, x: 0, y: 0, w: W, h, cutout: true, cover: true }] : [];

/** The photo set into the design, cropped to a box */
export const insetPhoto = (photo: PhotoBackground, x: number, y: number, w: number, h: number, radius = 24, border?: string): ImageLayer => ({
  id: 'photo',
  photoId: photo.photoId,
  width: photo.width,
  height: photo.height,
  x,
  y,
  w,
  h,
  cutout: false,
  radius,
  ...(border ? { border } : {}),
});

/** Text colour that reads on the photo's tones */
export const inkOn = (photo: PhotoBackground, prefer = '#FFFFFF') => bestTextColor(photo.tones, [prefer, prefer === '#FFFFFF' ? '#0B0B0F' : '#FFFFFF']);

export const flat = (c: string) => `Perfectly flat, solid, seamless background in one colour, exactly ${c}`;

/** The prompt line that keeps the cut-out colour off the subject */
export const keepOff = (key: KeyColor) => `Nobody and nothing in the picture is bright ${key === 'magenta' ? 'pink or magenta' : key}.`;

export function shape(partial: Partial<ShapeLayer> & Pick<ShapeLayer, 'id' | 'kind' | 'x' | 'y' | 'w' | 'h'>): ShapeLayer {
  return { ...partial, w: Math.max(2, partial.w), h: Math.max(2, partial.h) };
}

/** A finished design from a layout */
export function design(
  styleId: string,
  layoutId: string,
  format: FormatId,
  colors: Colors,
  parts: { background: DesignDoc['background']; layers: TextLayer[]; shapes?: ShapeLayer[]; images?: ImageLayer[]; overlay?: DesignDoc['overlay'] }
): DesignDoc {
  return {
    format,
    styleId,
    layoutId,
    colors,
    background: parts.background,
    layers: parts.layers.filter((l) => l.text.trim()),
    ...(parts.shapes?.length ? { shapes: parts.shapes } : {}),
    ...(parts.images?.length ? { images: parts.images } : {}),
    ...(parts.overlay ? { overlay: parts.overlay } : {}),
  };
}

/**
 * A page of one colour with the cut-out on it, or (when the cut-out failed)
 * the photo itself, which was made on that colour anyway
 */
export function pageWithSubject(input: BuildInput, page: string): { background: DesignDoc['background']; images: ImageLayer[]; cut: boolean } {
  const h = heightOf(input.format);
  if (input.cutout) return { background: { kind: 'solid', color: page }, images: cutoutLayer(input.cutout, h), cut: true };
  return { background: photoBg(input.photo), images: [], cut: false };
}
