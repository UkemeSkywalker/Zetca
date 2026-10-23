/**
 * Design styles: ready-made layouts that turn a few lines of text into a
 * finished post, in colour pairs that always contrast.
 */

import { bestTextColor, blend, luminance } from './contrast';
import { FORMATS, type DesignDoc, type FormatId, type PhotoBackground, type TextLayer } from './types';
import { readableOverlay } from './photo';

export interface Palette {
  id: string;
  name: string;
  background: string;
  text: string;
  /** Fill for pills and small accents */
  accent: string;
}

/** Every pair here passes 4.5:1 (checked in the tests) */
export const PALETTES: Palette[] = [
  { id: 'green', name: 'Green', background: '#15803D', text: '#FFFFFF', accent: '#0B0B0F' },
  { id: 'black', name: 'Black', background: '#0B0B0F', text: '#FACC15', accent: '#FACC15' },
  { id: 'red', name: 'Red', background: '#DC2626', text: '#FFFFFF', accent: '#0B0B0F' },
  { id: 'yellow', name: 'Yellow', background: '#FACC15', text: '#0B1C30', accent: '#0B1C30' },
  { id: 'indigo', name: 'Indigo', background: '#4F46E5', text: '#FFFFFF', accent: '#FACC15' },
  { id: 'cream', name: 'Cream', background: '#FFF7E6', text: '#0B0B0F', accent: '#DC2626' },
  { id: 'navy', name: 'Navy', background: '#0B1C30', text: '#FFFFFF', accent: '#FACC15' },
  { id: 'orange', name: 'Orange', background: '#F97316', text: '#0B0B0F', accent: '#0B0B0F' },
];

export const paletteById = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];

/** The words that go on a design */
export interface DesignText {
  headline: string;
  /** A small label above the headline, e.g. "DAILY REMINDER" */
  kicker?: string;
  /** A line of supporting text */
  body?: string;
  /** The brand's handle or name, at the bottom */
  footer?: string;
}

export type StyleCategory = 'bold' | 'quote' | 'announcement' | 'tips' | 'photo';

export interface DesignStyle {
  id: string;
  name: string;
  category: StyleCategory;
  description: string;
  /** Palette used for the gallery example */
  palette: string;
  example: DesignText;
  /** Photo styles put the words over a photo (and use `photo`, or a sample) */
  usesPhoto?: boolean;
  build(text: DesignText, format: FormatId, palette: Palette, photo?: PhotoBackground): DesignDoc;
}

/** Photos that ship with Zetca, for the style examples (from Pixabay, free to use) */
export const SAMPLE_PHOTOS: Record<string, PhotoBackground> = {
  gym: {
    kind: 'photo',
    photoId: 'sample:gym',
    width: 1014,
    height: 1350,
    focusX: 0.5,
    focusY: 0.4,
    fit: 'fill',
    tones: ['#392112', '#905335'],
    credit: { name: 'Pexels', url: 'https://pixabay.com/photos/man-1868632/', source: 'pixabay' },
  },
  coffee: {
    kind: 'photo',
    photoId: 'sample:coffee',
    width: 897,
    height: 1350,
    focusX: 0.5,
    focusY: 0.5,
    fit: 'fill',
    tones: ['#2A201E', '#A78369'],
    credit: { name: 'RuslanSikunov', url: 'https://pixabay.com/photos/coffee-7830087/', source: 'pixabay' },
  },
};

export const samplePhotoUrl = (photoId: string) => `/designer/samples/${photoId.replace(/^sample:/, '')}.jpg`;

const M = 84; // margin

function layer(partial: Partial<TextLayer> & Pick<TextLayer, 'id' | 'role' | 'text' | 'x' | 'y' | 'width' | 'height'>): TextLayer {
  return {
    font: 'jakarta',
    weight: 800,
    size: 40,
    color: '#FFFFFF',
    align: 'left',
    valign: 'top',
    lineHeight: 1.1,
    uppercase: false,
    letterSpacing: 0,
    ...partial,
  };
}

function kickerLayer(text: string | undefined, color: string, align: TextLayer['align'] = 'left'): TextLayer[] {
  if (!text) return [];
  return [layer({ id: 'kicker', role: 'kicker', text, x: M, y: M, width: 1080 - M * 2, height: 60, size: 30, color, align, uppercase: true, letterSpacing: 0.12 })];
}

function footerLayer(text: string | undefined, color: string, h: number, align: TextLayer['align'] = 'left'): TextLayer[] {
  if (!text) return [];
  return [
    layer({ id: 'footer', role: 'footer', text, x: M, y: h - M - 50, width: 1080 - M * 2, height: 50, size: 30, color, align, uppercase: true, letterSpacing: 0.08 }),
  ];
}

function solid(format: FormatId, styleId: string, background: string, layers: TextLayer[]): DesignDoc {
  return { format, styleId, background: { kind: 'solid', color: background }, layers };
}

export const STYLES: DesignStyle[] = [
  {
    id: 'bold-statement',
    name: 'Bold statement',
    category: 'bold',
    description: 'One big line that stops the scroll',
    palette: 'green',
    example: { kicker: 'Daily reminder', headline: 'No gym?\nNo problem.', footer: '@yourbrand' },
    build(text, format, p) {
      const h = FORMATS[format].height;
      return solid(format, this.id, p.background, [
        ...kickerLayer(text.kicker, p.text),
        layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: M + 90, width: 1080 - M * 2, height: h - M * 2 - 220, size: 190, font: 'anton', color: p.text, valign: 'middle', lineHeight: 1.0, uppercase: true }),
        ...footerLayer(text.footer, p.text, h),
      ]);
    },
  },
  {
    id: 'quote-card',
    name: 'Quote card',
    category: 'quote',
    description: 'A quote or a line worth saving',
    palette: 'cream',
    example: { headline: 'Small steps every day.', footer: '— Your name' },
    build(text, format, p) {
      const h = FORMATS[format].height;
      return solid(format, this.id, p.background, [
        layer({ id: 'mark', role: 'kicker', text: '“', x: M, y: h * 0.16, width: 1080 - M * 2, height: 200, size: 260, lineHeight: 0.75, font: 'serif', color: p.accent === p.background ? p.text : bestTextColor([p.background], [p.accent, p.text]), align: 'center' }),
        layer({ id: 'headline', role: 'headline', text: text.headline, x: M + 20, y: h * 0.16 + 200, width: 1080 - (M + 20) * 2, height: h * 0.5 - 120, size: 120, font: 'serif', weight: 400, color: p.text, align: 'center', valign: 'middle', lineHeight: 1.15 }),
        ...(text.footer
          ? [layer({ id: 'footer', role: 'footer', text: text.footer, x: M, y: h * 0.66 + 120, width: 1080 - M * 2, height: 50, size: 32, color: p.text, align: 'center', uppercase: true, letterSpacing: 0.1 })]
          : []),
      ]);
    },
  },
  {
    id: 'countdown',
    name: 'Countdown',
    category: 'bold',
    description: 'Challenges, series and "Day 12 of 30" posts',
    palette: 'red',
    example: { kicker: 'Sprint challenge', headline: 'Day 12\nof 30', footer: '@yourbrand' },
    build(text, format, p) {
      const h = FORMATS[format].height;
      return solid(format, this.id, p.background, [
        ...kickerLayer(text.kicker, p.text),
        layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: M + 90, width: 1080 - M * 2, height: h - M * 2 - 220, size: 230, font: 'archivo', color: p.text, valign: 'bottom', lineHeight: 0.98, uppercase: true, letterSpacing: -0.02 }),
        ...footerLayer(text.footer, p.text, h),
      ]);
    },
  },
  {
    id: 'announcement',
    name: 'Announcement',
    category: 'announcement',
    description: 'Launches, drops and news',
    palette: 'black',
    example: { kicker: 'Limited spots', headline: 'New program drops Friday', footer: 'Early access opening' },
    build(text, format, p) {
      const h = FORMATS[format].height;
      const pillText = bestTextColor([p.accent], [p.background, '#FFFFFF', '#0B0B0F']);
      return solid(format, this.id, p.background, [
        ...(text.kicker
          ? [layer({ id: 'kicker', role: 'pill', text: text.kicker, x: M, y: M, width: 1080 - M * 2, height: 70, size: 30, color: pillText, fill: p.accent, uppercase: true, letterSpacing: 0.08 })]
          : []),
        layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: M + 110, width: 1080 - M * 2, height: h - M * 2 - 240, size: 200, font: 'anton', color: p.text, valign: 'middle', lineHeight: 0.98, uppercase: true }),
        ...footerLayer(text.footer, p.text, h),
      ]);
    },
  },
  {
    id: 'headline-body',
    name: 'Tip card',
    category: 'tips',
    description: 'A headline with a short explanation',
    palette: 'indigo',
    example: { kicker: 'Tip #3', headline: '3 habits for focus', body: 'Phone in another room. One tab open. 25 minutes on, 5 off.', footer: '@yourbrand' },
    build(text, format, p) {
      const h = FORMATS[format].height;
      return solid(format, this.id, p.background, [
        ...kickerLayer(text.kicker, p.text),
        layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: M + 100, width: 1080 - M * 2, height: h * 0.42, size: 150, font: 'jakarta', weight: 800, color: p.text, valign: 'bottom', lineHeight: 1.02, letterSpacing: -0.03 }),
        ...(text.body
          ? [layer({ id: 'body', role: 'body', text: text.body, x: M, y: M + 130 + h * 0.42, width: 1080 - M * 2, height: h * 0.3, size: 46, font: 'jakarta', weight: 600, color: p.text, lineHeight: 1.3 })]
          : []),
        ...footerLayer(text.footer, p.text, h),
      ]);
    },
  },
  {
    id: 'glow',
    name: 'Gradient glow',
    category: 'bold',
    description: 'Centred words on a rich gradient',
    palette: 'indigo',
    example: { kicker: 'Mindset shift', headline: 'Discipline over mood', footer: '@yourbrand' },
    build(text, format, p) {
      const h = FORMATS[format].height;
      // Dark text gets a lighter second colour, light text a darker one, so both ends still contrast
      const shade = luminance(p.text) < 0.2 ? blend(p.background, '#FFFFFF', 0.35) : blend(p.background, '#000000', 0.45);
      const [from, to] = p.id === 'indigo' ? ['#312E81', '#7C3AED'] : [shade, p.background];
      const color = bestTextColor([from, to], [p.text, '#FFFFFF', '#0B0B0F']);
      return {
        format,
        styleId: this.id,
        background: { kind: 'gradient', from, to, angle: 160 },
        layers: [
          ...kickerLayer(text.kicker, color, 'center'),
          layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: M + 90, width: 1080 - M * 2, height: h - M * 2 - 220, size: 170, font: 'jakarta', weight: 800, color, align: 'center', valign: 'middle', lineHeight: 1.0, letterSpacing: -0.03 }),
          ...footerLayer(text.footer, color, h, 'center'),
        ],
      };
    },
  },
  {
    id: 'photo-text',
    name: 'Photo + text',
    category: 'photo',
    description: 'Big words over a free stock photo',
    palette: 'black',
    usesPhoto: true,
    example: { kicker: 'HIIT workout', headline: '15-min full body', footer: '@yourbrand' },
    build(text, format, _p, photo = SAMPLE_PHOTOS.gym) {
      const h = FORMATS[format].height;
      return readableOverlay({
        format,
        styleId: this.id,
        background: photo,
        overlay: { color: '#000000', opacity: 0.45 },
        layers: [
          ...kickerLayer(text.kicker, '#FFFFFF', 'center'),
          layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: M + 90, width: 1080 - M * 2, height: h - M * 2 - 220, size: 190, font: 'archivo', color: '#FFFFFF', align: 'center', valign: 'middle', lineHeight: 0.98, uppercase: true, letterSpacing: -0.01 }),
          ...footerLayer(text.footer, '#FFFFFF', h, 'center'),
        ],
      });
    },
  },
  {
    id: 'product',
    name: 'Product spotlight',
    category: 'photo',
    description: 'Show a product with a call to action',
    palette: 'yellow',
    usesPhoto: true,
    example: { kicker: 'Shop now', headline: 'Fresh roast, every morning', footer: '@yourbrand' },
    build(text, format, p, photo = SAMPLE_PHOTOS.coffee) {
      const h = FORMATS[format].height;
      const pillText = bestTextColor([p.background], ['#0B0B0F', '#FFFFFF']);
      return readableOverlay({
        format,
        styleId: this.id,
        background: photo,
        overlay: { color: '#000000', opacity: 0.4 },
        layers: [
          layer({ id: 'headline', role: 'headline', text: text.headline, x: M, y: h * 0.45, width: 1080 - M * 2, height: h * 0.33, size: 150, font: 'jakarta', weight: 800, color: '#FFFFFF', valign: 'bottom', lineHeight: 1.0, letterSpacing: -0.03 }),
          ...(text.kicker
            ? [layer({ id: 'kicker', role: 'pill', text: text.kicker, x: M, y: h * 0.8, width: 1080 - M * 2, height: 80, size: 34, color: pillText, fill: p.background, uppercase: true, letterSpacing: 0.06 })]
            : []),
          ...(text.footer
            ? [layer({ id: 'footer', role: 'footer', text: text.footer, x: M, y: M, width: 1080 - M * 2, height: 50, size: 30, color: '#FFFFFF', uppercase: true, letterSpacing: 0.08 })]
            : []),
        ],
      });
    },
  },
];

export const styleById = (id: string) => STYLES.find((s) => s.id === id);

/** Pulls the words back out of a design, e.g. to re-flow them into another style */
export function textOf(doc: DesignDoc): DesignText {
  const get = (...roles: TextLayer['role'][]) => doc.layers.find((l) => roles.includes(l.role) && l.id !== 'mark')?.text;
  return { headline: get('headline') ?? '', kicker: get('kicker', 'pill'), body: get('body'), footer: get('footer') };
}

/** Rebuilds a design in another style or palette, keeping its words */
export function restyle(doc: DesignDoc, styleId: string, palette: Palette, format: FormatId = doc.format): DesignDoc {
  const style = styleById(styleId) ?? STYLES[0];
  // A photo style keeps the design's photo
  const photo = doc.background.kind === 'photo' ? doc.background : undefined;
  return style.build(textOf(doc), format, palette, photo);
}

/** Palettes a style is shown in when picking from 4 results */
export function variationPalettes(style: DesignStyle): Palette[] {
  const first = paletteById(style.palette);
  return [first, ...PALETTES.filter((p) => p.id !== first.id)].slice(0, 4);
}
