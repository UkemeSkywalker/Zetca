/**
 * Carousels: a cover in the style's layout, then content slides and a
 * closing call-to-action slide drawn in the same colours and fonts, so every
 * slide reads as one series. Only the cover needs an AI image.
 */

import { bestTextColor, luminance } from './contrast';
import type { DesignDoc, FontId, FormatId, PhotoBackground, ShapeLayer, TextLayer } from './types';
import { darken, design, heightOf, insetPhoto, lighten, M, plain, readable, rich, shape, text, W, type Colors } from './recipeKit';

/** How many slides a carousel can have, cover and closing included */
export const MIN_SLIDES = 3;
export const MAX_SLIDES = 10;

export const CONTENT_LAYOUTS = [
  { id: 'number-left', name: 'Number left' },
  { id: 'number-top', name: 'Number top' },
  { id: 'photo-top', name: 'Photo top' },
] as const;
export type ContentLayout = (typeof CONTENT_LAYOUTS)[number]['id'];

/** Slides other than the cover carry their kind in `layoutId` */
export const SLIDE_PREFIX = 'slide:';
export const CLOSING_ID = `${SLIDE_PREFIX}closing`;
export const isSlideLayout = (layoutId?: string) => !!layoutId?.startsWith(SLIDE_PREFIX);
export const contentLayoutOf = (layoutId?: string): ContentLayout | null => {
  const id = layoutId?.slice(SLIDE_PREFIX.length);
  return CONTENT_LAYOUTS.some((l) => l.id === id) ? (id as ContentLayout) : null;
};

/** The words of one content slide */
export interface SlideText {
  headline: string;
  body?: string;
}

/** The words of a whole carousel (the cover's own words come from the post) */
export interface CarouselText {
  slides: SlideText[];
  closing: { headline: string; cta?: string };
  /** The brand's name or handle */
  footer?: string;
}

/** A style's type on its slides, so they match its cover */
interface Theme {
  font: FontId;
  weight: TextLayer['weight'];
}

const THEMES: Record<string, Theme> = {
  'clinic-editorial': { font: 'serif', weight: 400 },
  'blueprint-thinker': { font: 'serif', weight: 400 },
  'word-behind': { font: 'serif', weight: 400 },
  'torn-paper': { font: 'archivo', weight: 400 },
  'fire-money': { font: 'archivo', weight: 400 },
  'ribbon-celebration': { font: 'archivo', weight: 400 },
  'collage-zine': { font: 'archivo', weight: 400 },
  'mono-studio': { font: 'archivo', weight: 400 },
  'while-others-blur': { font: 'archivo', weight: 400 },
  'celebration-script': { font: 'archivo', weight: 400 },
  'reach-out': { font: 'archivo', weight: 400 },
  'street-flyer': { font: 'anton', weight: 400 },
  'sticker-portrait': { font: 'bebas', weight: 400 },
  'concept-object': { font: 'jakarta', weight: 600 },
  'strike-through': { font: 'jakarta', weight: 600 },
  'miniature-world': { font: 'jakarta', weight: 700 },
};
export const themeOf = (styleId: string): Theme => THEMES[styleId] ?? { font: 'jakarta', weight: 800 };

/** A deeper shade of the page colour, for boxes and the closing slide */
function deepOf(main: string): string {
  return luminance(main) < 0.12 ? lighten(main, 0.16) : darken(main, 0.5);
}

/** A light card on the page for the longer words */
function cardOf(main: string): string {
  return luminance(main) < 0.35 ? lighten(main, 0.88) : '#FFFFFF';
}

const counter = (index: number, total: number) => `${index + 1}/${total}`;

/** The brand line and the "2/5" counter at the foot of every slide */
function foot(h: number, ink: string, footer: string | undefined, index: number, total: number): TextLayer[] {
  return [
    ...(footer ? [text({ id: 'footer', role: 'footer', text: footer, x: M, y: h - M - 30, width: W * 0.6, height: 44, size: 26, weight: 700, color: ink })] : []),
    text({ id: 'count', role: 'kicker', text: counter(index, total), x: W - M - 200, y: h - M - 30, width: 200, height: 44, size: 26, weight: 700, color: ink, align: 'right' }),
  ];
}

export interface SlideInput {
  styleId: string;
  format: FormatId;
  colors: Colors;
  /** This slide's place, counting from 0 (the cover is 0) */
  index: number;
  total: number;
  text: SlideText;
  footer?: string;
  /** For "Photo top": the cover's photo, shown again */
  photo?: PhotoBackground;
}

/** A content slide: a numbered point with a short headline and a line or two */
export function contentSlide(layout: ContentLayout, input: SlideInput): DesignDoc {
  const { styleId, format, colors, index, total, footer } = input;
  const h = heightOf(format);
  const theme = themeOf(styleId);
  const page = colors.main;
  const ink = readable(colors.ink, page, 4.5);
  const accentInk = readable('#FFFFFF', colors.accent, 3);
  const deep = deepOf(page);
  const card = cardOf(page);
  const n = String(index);
  const headline = plain(input.text.headline)!;
  const body = plain(input.text.body);
  const shapes: ShapeLayer[] = [];
  const layers: TextLayer[] = [];
  const images = [];

  if (layout === 'number-top') {
    layers.push(
      text({ id: 'num', role: 'kicker', text: n.padStart(2, '0'), x: M, y: h * 0.1, width: W - M * 2, height: h * 0.18, size: 220, font: theme.font, weight: theme.weight, color: readable(colors.accent, page, 2.2), align: 'center', valign: 'middle', lineHeight: 0.9 }),
      rich({ id: 'headline', role: 'headline', x: M, y: h * 0.32, width: W - M * 2, height: h * 0.24, size: 96, font: theme.font, weight: theme.weight, color: ink, align: 'center', valign: 'middle', lineHeight: 1.04, letterSpacing: -0.01 }, input.text.headline, { color: readable(colors.accent, page, 3), fallback: 0 })
    );
    shapes.push(shape({ id: 'rule', kind: 'rect', x: W / 2 - 60, y: h * 0.59, w: 120, h: 6, radius: 3, fill: colors.accent }));
    if (body) layers.push(text({ id: 'body', role: 'body', text: body, x: M * 1.5, y: h * 0.63, width: W - M * 3, height: h * 0.22, size: 40, weight: 600, color: ink, align: 'center', lineHeight: 1.3 }));
  } else {
    const photoTop = layout === 'photo-top' && !!input.photo;
    const top = photoTop ? h * 0.47 : h * 0.1;
    if (photoTop) images.push(insetPhoto(input.photo!, M, h * 0.08, W - M * 2, h * 0.34, 36));
    const d = 128;
    shapes.push(shape({ id: 'num-dot', kind: 'ellipse', x: M, y: top, w: d, h: d, fill: colors.accent }));
    layers.push(text({ id: 'num', role: 'kicker', text: n, x: M, y: top, width: d, height: d, size: 64, font: theme.font, weight: theme.weight === 400 ? 400 : 800, color: accentInk, align: 'center', valign: 'middle' }));
    const box = { x: M + d + 28, y: top - 6, w: W - M * 2 - d - 28, h: photoTop ? h * 0.15 : h * 0.2 };
    shapes.push(shape({ id: 'head-box', kind: 'bubble', ...box, radius: 40, fill: deep, tail: 'left' }));
    layers.push(text({ id: 'headline', role: 'headline', text: headline, x: box.x + 40, y: box.y + 28, width: box.w - 80, height: box.h - 56, size: 72, font: theme.font, weight: theme.weight, color: readable('#FFFFFF', deep, 4.5), valign: 'middle', lineHeight: 1.04 }));
    if (body) {
      const c = { x: M + d + 28, y: box.y + box.h + 28, w: box.w, h: photoTop ? h * 0.2 : h * 0.3 };
      shapes.push(shape({ id: 'body-card', kind: 'rect', ...c, radius: 32, fill: card }));
      layers.push(text({ id: 'body', role: 'body', text: body, x: c.x + 36, y: c.y + 30, width: c.w - 72, height: c.h - 60, size: 40, weight: 600, color: readable(ink, card, 4.5), valign: 'middle', lineHeight: 1.3 }));
    }
  }
  layers.push(...foot(h, ink, footer, index, total));
  return design(styleId, `${SLIDE_PREFIX}${layout}`, format, colors, { background: { kind: 'solid', color: page }, layers, shapes, images });
}

/** The last slide: a closing line and the button, on the style's deeper colour */
export function closingSlide(input: Omit<SlideInput, 'text' | 'photo'> & { text: { headline: string; cta?: string } }): DesignDoc {
  const { styleId, format, colors, index, total, footer } = input;
  const h = heightOf(format);
  const theme = themeOf(styleId);
  const bg = deepOf(colors.main);
  const ink = readable('#FFFFFF', bg, 4.5);
  const cta = input.text.cta?.trim() || 'Follow for more';
  return design(styleId, CLOSING_ID, format, colors, {
    background: { kind: 'solid', color: bg },
    shapes: [
      shape({ id: 'bar', kind: 'rect', x: M, y: h * 0.2, w: 140, h: 12, radius: 6, fill: colors.accent }),
      shape({ id: 'glow', kind: 'ellipse', x: W * 0.45, y: h * 0.55, w: W * 0.9, h: W * 0.9, fill: lighten(bg, 0.08), opacity: 0.7 }),
    ],
    layers: [
      rich({ id: 'headline', role: 'headline', x: M, y: h * 0.24, width: W - M * 2, height: h * 0.32, size: 110, font: theme.font, weight: theme.weight, color: ink, lineHeight: 1.02, letterSpacing: -0.02 }, input.text.headline, { color: readable(colors.accent, bg, 3), fallback: 0 }),
      text({ id: 'cta', role: 'pill', text: cta, x: M, y: h * 0.62, width: W - M * 2, height: 100, size: 40, weight: 800, fill: colors.accent, color: bestTextColor([colors.accent]) }),
      ...foot(h, ink, footer, index, total),
    ],
  });
}

/** A slide in its place: the closing slide for the last, a content slide otherwise */
export function slideFor(i: number, total: number, input: Omit<SlideInput, 'index' | 'total' | 'text'>, words: CarouselText, layouts: ContentLayout[] = []): DesignDoc {
  if (i === total - 1) return closingSlide({ ...input, index: i, total, text: words.closing });
  const t = words.slides[i - 1] ?? { headline: '' };
  // Mix the content layouts so the slides don't all look the same
  const layout = layouts[i - 1] ?? (i % 2 === 1 ? 'number-left' : 'number-top');
  return contentSlide(layout === 'photo-top' && !input.photo ? 'number-left' : layout, { ...input, index: i, total, text: t });
}

/** Every slide after the cover, numbered for a carousel of `words.slides.length + 2` slides */
export function carouselSlides(cover: DesignDoc, words: CarouselText, colors: Colors, photo?: PhotoBackground): DesignDoc[] {
  const total = words.slides.length + 2;
  const base = { styleId: cover.styleId, format: cover.format, colors, footer: words.footer, photo };
  // Each slide keeps the cover's photo, so it can switch to "Photo top" later
  return Array.from({ length: total - 1 }, (_, k) => slideFor(k + 1, total, base, words)).map((d) => (photo ? { ...d, photo } : d));
}

/** Read a slide's words back (to rebuild it in new colours or another layout) */
export function slideTextOf(doc: DesignDoc): SlideText & { cta?: string } {
  const by = (id: string) => doc.layers.find((l) => l.id === id)?.text;
  return { headline: by('headline') ?? '', body: by('body'), cta: by('cta') };
}

/** Renumbers a slide (after slides are added, removed or moved) */
export function renumber(doc: DesignDoc, index: number, total: number): DesignDoc {
  return {
    ...doc,
    layers: doc.layers.map((l) => (l.id === 'count' ? { ...l, text: counter(index, total) } : l.id === 'num' ? { ...l, text: l.text.length === 2 && contentLayoutOf(doc.layoutId) === 'number-top' ? String(index).padStart(2, '0') : String(index) } : l)),
  };
}
