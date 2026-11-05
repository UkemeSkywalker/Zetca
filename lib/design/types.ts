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
  // A YouTube thumbnail; saved at 1280 × 720 (see EXPORT_WIDTH)
  landscape: { width: 1080, height: 607.5, label: 'YouTube 16:9', short: '16:9' },
} as const;

/** The width each format is saved at (YouTube asks for 1280 × 720 thumbnails) */
export const EXPORT_WIDTH: Partial<Record<keyof typeof FORMATS, number>> = { landscape: 1280 };

export type FormatId = keyof typeof FORMATS;
export const FORMAT_IDS = Object.keys(FORMATS) as FormatId[];

export const FONT_IDS = ['anton', 'bebas', 'archivo', 'jakarta', 'serif', 'script'] as const;
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
  credit: z.object({ name: z.string().max(80), url: z.string().url().max(300), source: z.enum(['pixabay', 'sample', 'ai']) }),
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
  /** Drawn under the image layers (the giant word behind a person) */
  behind: z.boolean().optional(),
  /** Slanted letters (a style's accent words, "anywhere", "Zero Drama") */
  italic: z.boolean().optional(),
  /**
   * Words drawn differently: counted from 0 across the whole text, `to` not
   * included. A colour, a line struck through them, or slanted.
   */
  marks: z
    .array(
      z.object({
        from: z.number().int().min(0),
        to: z.number().int().min(1),
        color: hex.optional(),
        strike: hex.optional(),
        italic: z.boolean().optional(),
        bold: z.boolean().optional(),
      })
    )
    .max(4)
    .optional(),
});
export type TextLayer = z.infer<typeof TextLayerSchema>;

/**
 * A picture placed on the design, above the background: a cut-out person or
 * product (a see-through PNG), or a photo in a frame. Saved photos only.
 */
export const ImageLayerSchema = z.object({
  id: z.string().min(1).max(40),
  photoId: z.string().min(1).max(80),
  /** The picture's own size, to keep its shape */
  width: z.number().positive(),
  height: z.number().positive(),
  /** Where it sits in the design (1080 wide), and how big */
  x: z.number(),
  y: z.number(),
  w: z.number().min(20),
  h: z.number().min(20),
  /** A see-through cut-out (true), or a photo with a background (false) */
  cutout: z.boolean(),
  /** Fill the box, cropped exactly like a photo background (keeps a cut-out lined up with its photo) */
  cover: z.boolean().optional(),
  /** Rounded corners in px (a photo set into the design) */
  radius: z.number().min(0).max(300).optional(),
  /** A thin border around a photo set into the design (a polaroid edge) */
  border: hex.optional(),
});
export type ImageLayer = z.infer<typeof ImageLayerSchema>;

/**
 * A flat shape drawn by Zetca (not part of the photo): the speech bubble a
 * headline sits in, a frame around the post, a blob, a footer strip.
 */
export const SHAPE_KINDS = ['rect', 'ellipse', 'bubble', 'scallop', 'frame', 'blob', 'zigzag', 'ribbon', 'steps', 'fade'] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

export const ShapeLayerSchema = z.object({
  id: z.string().min(1).max(40),
  kind: z.enum(SHAPE_KINDS),
  x: z.number(),
  y: z.number(),
  w: z.number().min(2),
  h: z.number().min(2),
  fill: hex.optional(),
  stroke: hex.optional(),
  strokeWidth: z.number().min(0).max(80).optional(),
  /** Corner rounding in px */
  radius: z.number().min(0).max(600).optional(),
  /** Bubbles: where the little tail points */
  tail: z.enum(['bl', 'br', 'tl', 'tr', 'left', 'right']).optional(),
  opacity: z.number().min(0).max(1).optional(),
  /** Fades: strongest at the top instead of the bottom */
  flip: z.boolean().optional(),
  /** Above the cut-out (a footer strip); otherwise just above the background */
  front: z.boolean().optional(),
});
export type ShapeLayer = z.infer<typeof ShapeLayerSchema>;

/** The three colours a style is built from */
export const DesignColorsSchema = z.object({ main: hex, ink: hex, accent: hex });
export type DesignColors = z.infer<typeof DesignColorsSchema>;

export const DesignDocSchema = z.object({
  format: z.enum(['square', 'portrait', 'story', 'landscape']),
  styleId: z.string().max(40),
  background: BackgroundSchema,
  overlay: z.object({ color: hex, opacity: z.number().min(0).max(0.9) }).optional(),
  layers: z.array(TextLayerSchema).max(16),
  /** Pictures above the background; text with `behind` goes under them */
  images: z.array(ImageLayerSchema).max(6).optional(),
  /** Flat shapes: bubbles, frames, blobs, strips */
  shapes: z.array(ShapeLayerSchema).max(16).optional(),
  /** Which of the style's layouts this is (styles with several) */
  layoutId: z.string().max(40).optional(),
  /** The colours it was built with, so they can be changed later */
  colors: DesignColorsSchema.optional(),
  /** The AI image it was made from, kept when only its cut-out is drawn (to switch layouts later) */
  photo: PhotoBackgroundSchema.optional(),
  /** An AI video under the words (the photo background is its first frame) */
  video: z
    .object({
      mediaId: z.string().min(1).max(80),
      durationSeconds: z.number().positive().max(60),
      /** The AI job that made it, and its quality: a draft can be made in HD later */
      jobId: z.string().max(40).optional(),
      quality: z.enum(['draft', 'hd', 'full_hd']).optional(),
    })
    .optional(),
});
export type DesignDoc = z.infer<typeof DesignDocSchema>;

export const DESIGN_SOURCES = ['template', 'stock', 'ai_image', 'ai_video'] as const;
export type DesignSource = (typeof DESIGN_SOURCES)[number];

/** The post a design is the visual for */
export const AttachedToSchema = z.object({
  /** The Copywriter post */
  copyId: z.string().min(1).max(80).optional(),
  /** The scheduled post */
  postId: z.string().min(1).max(80).optional(),
  platform: z.string().max(20),
});
export type AttachedTo = z.infer<typeof AttachedToSchema>;

export interface DesignRecord {
  designId: string;
  userId: string;
  name: string;
  source: DesignSource;
  doc: DesignDoc;
  attachedTo?: AttachedTo;
  /** The exported image of the current version, if it's been made */
  mediaId?: string;
  /** A carousel: every slide in order (the first is `doc`, the cover) */
  slides?: DesignDoc[];
  /** A carousel's exported slide images, in order (the first is `mediaId`) */
  mediaIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export const DesignInputSchema = z.object({
  name: z.string().trim().min(1, 'Give the design a name').max(80),
  source: z.enum(DESIGN_SOURCES).default('template'),
  attachedTo: AttachedToSchema.optional(),
  mediaId: z.string().min(1).max(80).optional(),
  /** A carousel: every slide in order, the cover first (it is also `doc`) */
  slides: z.array(DesignDocSchema).min(2).max(10).optional(),
  mediaIds: z.array(z.string().min(1).max(80)).min(2).max(10).optional(),
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

/**
 * The colours right behind a text layer: its own fill, else the solid shape
 * it sits on (a speech bubble, a card), else the background
 */
export function colorsBehind(doc: DesignDoc, layer: Pick<TextLayer, 'x' | 'y' | 'width' | 'height' | 'fill'>): string[] {
  if (layer.fill) return [layer.fill];
  const cx = layer.x + layer.width / 2;
  const cy = layer.y + layer.height / 2;
  const solid = (s: ShapeLayer) => !!s.fill && (s.opacity ?? 1) >= 0.85 && !['fade', 'frame', 'ribbon'].includes(s.kind);
  const under = [...(doc.shapes ?? [])].reverse().find((s) => solid(s) && cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h);
  return under ? [under.fill!] : backgroundColors(doc);
}
