/**
 * A design as data: a background, an optional see-through overlay and text
 * layers. Positions and sizes are in pixels of the full-size image (1080 wide),
 * so the same design draws identically at any preview size.
 */

import { z } from 'zod';
import { blend } from './contrast';

export const FORMATS = {
  square: { width: 1080, height: 1080, label: 'Square 1:1', short: '1:1' },
  portrait: { width: 1080, height: 1350, label: 'Portrait 4:5', short: '4:5' },
  story: { width: 1080, height: 1920, label: 'Story 9:16', short: '9:16' },
} as const;

export type FormatId = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

export const FONT_IDS = ['anton', 'bebas', 'archivo', 'jakarta', 'serif'] as const;
export type FontId = (typeof FONT_IDS)[number];

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a colour like #16A34A');

/**
 * Where a photo comes from:
 * - "sample:<name>": a photo that ships with Zetca (used by the style examples)
 * - "pixabay:<id>": a search result not saved yet (shown from `previewUrl`)
 * - anything else: a photo saved to the user's storage
 */
export const PhotoBackgroundSchema = z.object({
  kind: z.literal('photo'),
  photoId: z.string().min(1).max(80),
  previewUrl: z.string().url().max(500).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** The point of the photo kept in view when it's cropped, 0–1 */
  focusX: z.number().min(0).max(1),
  focusY: z.number().min(0).max(1),
  fit: z.enum(['fill', 'fit']),
  /** The photo's average and lightest tones, to check text contrast against */
  tones: z.array(hex).min(1).max(4),
  credit: z.object({ name: z.string().max(80), url: z.string().url().max(300), source: z.enum(['pixabay', 'sample']) }),
});
export type PhotoBackground = z.infer<typeof PhotoBackgroundSchema>;

export const BackgroundSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: hex }),
  z.object({ kind: z.literal('gradient'), from: hex, to: hex, angle: z.number().min(0).max(360) }),
  PhotoBackgroundSchema,
]);
export type Background = z.infer<typeof BackgroundSchema>;

export const isUnsavedPhoto = (id: string) => id.startsWith('pixabay:');

export const TextLayerSchema = z.object({
  id: z.string().min(1).max(40),
  /** What the layer is for, so styles and the AI can fill the right one */
  role: z.enum(['headline', 'kicker', 'body', 'footer', 'pill']),
  text: z.string().max(400),
  font: z.enum(FONT_IDS),
  weight: z.union([z.literal(400), z.literal(600), z.literal(700), z.literal(800)]),
  /** Largest font size in px; the text shrinks below this to fit its box */
  size: z.number().min(12).max(400),
  color: hex,
  align: z.enum(['left', 'center', 'right']),
  /** Where the lines sit inside the box when they don't fill it */
  valign: z.enum(['top', 'middle', 'bottom']),
  x: z.number(),
  y: z.number(),
  width: z.number().min(40),
  /** Height of the box the text must fit in */
  height: z.number().min(20),
  lineHeight: z.number().min(0.7).max(2),
  uppercase: z.boolean(),
  letterSpacing: z.number().min(-0.1).max(0.5),
  /** Pills: the fill drawn behind the text */
  fill: hex.optional(),
});
export type TextLayer = z.infer<typeof TextLayerSchema>;

export const DesignDocSchema = z.object({
  format: z.enum(['square', 'portrait', 'story']),
  styleId: z.string().max(40),
  background: BackgroundSchema,
  overlay: z.object({ color: hex, opacity: z.number().min(0).max(0.9) }).optional(),
  layers: z.array(TextLayerSchema).max(12),
});
export type DesignDoc = z.infer<typeof DesignDocSchema>;

export const DESIGN_SOURCES = ['template', 'stock', 'ai_image', 'ai_video'] as const;
export type DesignSource = (typeof DESIGN_SOURCES)[number];

export interface DesignRecord {
  designId: string;
  userId: string;
  name: string;
  source: DesignSource;
  doc: DesignDoc;
  createdAt: string;
  updatedAt: string;
}

export const DesignInputSchema = z.object({
  name: z.string().trim().min(1, 'Give the design a name').max(80),
  source: z.enum(DESIGN_SOURCES).default('template'),
  doc: DesignDocSchema.refine((d) => d.background.kind !== 'photo' || !isUnsavedPhoto(d.background.photoId), {
    message: 'Save the photo before saving the design',
  }),
});
export type DesignInput = z.infer<typeof DesignInputSchema>;

/** The colours behind the text, to check contrast against */
export function backgroundColors(doc: DesignDoc): string[] {
  const bg = doc.background;
  const colors = bg.kind === 'solid' ? [bg.color] : bg.kind === 'gradient' ? [bg.from, bg.to] : bg.tones;
  const overlay = doc.overlay;
  return overlay ? colors.map((c) => blend(c, overlay.color, overlay.opacity)) : colors;
}
