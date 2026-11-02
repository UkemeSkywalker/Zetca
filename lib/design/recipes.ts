/**
 * Style recipes: the styles in the style library. A recipe is not a fixed
 * picture. It says how the AI should make each post's image and how the
 * words sit on it, so a whole campaign looks like one series while every post
 * has its own words and image.
 *
 * Recipes copy a look, never a brand: no real logos or real people in the
 * prompts or the examples.
 */

import type { KeyColor } from '../media/chromaKey';
import { bestTextColor } from './contrast';
import { FORMATS, type DesignDoc, type FormatId, type ImageLayer, type PhotoBackground, type TextLayer } from './types';

export type RecipeFamily = 'cutout' | 'mono' | 'giant-word' | 'premium' | 'celebration' | 'big-idea' | 'flyer';

export const FAMILY_NAMES: Record<RecipeFamily, string> = {
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
  /** The main words (for giant-word styles, the first word is the giant one) */
  headline: string;
  /** A short label, e.g. a hashtag or "NEW ERA" */
  kicker?: string;
  /** A supporting line */
  body?: string;
  /** The brand's name or handle */
  footer?: string;
}

/** A brand's colours, when a campaign uses "My brand" instead of the style's own */
export interface RecipeColors {
  /** The flat colour or main colour of the style */
  main: string;
  /** Text and accents */
  ink?: string;
  accent?: string;
}

export interface StyleRecipe {
  id: string;
  name: string;
  family: RecipeFamily;
  description: string;
  /** The style's own colours */
  colors: Required<RecipeColors>;
  /** Make the image, then cut the subject out of this flat colour (giant-word styles) */
  cutout?: KeyColor;
  /** The AI image prompt for one post: `idea` is what the post is about */
  imagePrompt(idea: string, colors: Required<RecipeColors>): string;
  /** The finished design from the AI image (and its cut-out, when the recipe makes one) */
  build(input: { text: RecipeText; format: FormatId; photo: PhotoBackground; cutout?: { photoId: string; width: number; height: number }; colors: Required<RecipeColors> }): DesignDoc;
  /** Example words for the gallery */
  example: RecipeText;
}

const M = 84;

function text(partial: Partial<TextLayer> & Pick<TextLayer, 'id' | 'role' | 'text' | 'x' | 'y' | 'width' | 'height'>): TextLayer {
  return { font: 'jakarta', weight: 800, size: 40, color: '#FFFFFF', align: 'left', valign: 'top', lineHeight: 1.05, uppercase: false, letterSpacing: 0, ...partial };
}

const NO_TEXT = 'Absolutely no text, letters, numbers, logos, brand names or watermarks anywhere in the image.';

/** The first word, for the giant word (letters and digits only) */
export const giantWord = (headline: string) => (headline.trim().split(/\s+/)[0] ?? '').replace(/[^\p{L}\p{N}]/gu, '').slice(0, 8) || 'NOW';
/** The rest of the headline after the giant word */
const afterGiant = (headline: string) => headline.trim().split(/\s+/).slice(1).join(' ');

/** Merges brand colours over the style's own, keeping text readable */
export function recipeColors(recipe: StyleRecipe, brand?: RecipeColors): Required<RecipeColors> {
  if (!brand) return recipe.colors;
  const main = brand.main;
  const ink = brand.ink && bestTextColor([main], [brand.ink, '#0B0B0F', '#FFFFFF']) === brand.ink ? brand.ink : bestTextColor([main], ['#0B0B0F', '#FFFFFF']);
  return { main, ink, accent: brand.accent ?? recipe.colors.accent };
}

export const RECIPES: StyleRecipe[] = [
  {
    id: 'marble-thinker',
    name: 'Marble Thinker',
    family: 'cutout',
    description: 'A marble statue acting out the idea, on one bold colour',
    colors: { main: '#FFB000', ink: '#0B0B0F', accent: '#0B0B0F' },
    example: { headline: 'Marketing is not advertising.', kicker: '#yourbrand', footer: 'Your Brand' },
    imagePrompt: (idea, c) =>
      `Advertising poster photo: a classical white marble statue of a thoughtful bearded Greek philosopher in draped robes, acting out this idea: "${idea}". ` +
      `The statue sits in the lower right of the frame. Perfectly flat, solid, seamless background in one colour, exactly ${c.main}, with a large empty area in the upper left for a headline. ` +
      `Crisp studio light, soft natural shadow under the statue. Any laptop, phone or object in the scene is plain and unbranded. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const layers: TextLayer[] = [
        text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 80, width: 1080 * 0.62 - M, height: h * 0.36, size: 128, font: 'jakarta', weight: 800, color: colors.ink, lineHeight: 1.02, letterSpacing: -0.03 }),
      ];
      if (t.footer) layers.push(text({ id: 'footer', role: 'footer', text: t.footer, x: 1080 * 0.5, y: M - 20, width: 1080 * 0.5 - M, height: 50, size: 30, weight: 700, color: colors.ink, align: 'right' }));
      if (t.kicker) layers.push(text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: h - M - 50, width: 1080 * 0.5, height: 50, size: 30, weight: 700, color: colors.ink }));
      return { format, styleId: 'marble-thinker', background: { ...photo, focusX: 0.5, focusY: 0.5 }, layers };
    },
  },
  {
    id: 'word-behind',
    name: 'Word Behind',
    family: 'giant-word',
    description: 'A huge word that passes behind the person',
    colors: { main: '#FACC15', ink: '#FFFFFF', accent: '#FACC15' },
    cutout: 'green',
    example: { headline: 'Rise and shine', body: 'Baked before sunrise', kicker: 'Lekki, Lagos', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `Editorial portrait photo about this idea: "${idea}". One person, centred, looking at the camera, upper body visible, sitting or standing in a warm, softly lit real place that fits the idea. ` +
      `Their head is in the middle of the frame with plenty of empty wall or space above and around it. Warm golden light, shallow depth of field, rich colour. The person wears nothing bright green. ${NO_TEXT}`,
    build({ text: t, format, photo, cutout, colors }) {
      const h = FORMATS[format].height;
      const word = giantWord(t.headline).toUpperCase();
      const layers: TextLayer[] = [
        text({ id: 'headline', role: 'headline', text: word, x: 30, y: h * 0.1, width: 1020, height: h * 0.27, size: 400, font: 'serif', weight: 400, color: colors.main, align: 'center', valign: 'middle', lineHeight: 0.9, letterSpacing: -0.02, behind: true }),
      ];
      const small = (id: string, role: TextLayer['role'], value: string | undefined, x: number, y: number, align: TextLayer['align']) =>
        value ? [text({ id, role, text: value, x, y, width: 1080 / 2 - M, height: 50, size: 30, weight: 600, color: colors.ink, align })] : [];
      layers.push(
        ...small('footer', 'footer', t.footer, M, M - 20, 'left'),
        ...small('kicker', 'kicker', t.kicker, 1080 / 2, M - 20, 'right'),
        ...small('body', 'body', t.body ?? afterGiant(t.headline), M, h - M - 40, 'left')
      );
      const images: ImageLayer[] = cutout
        ? [{ id: 'subject', photoId: cutout.photoId, width: cutout.width, height: cutout.height, x: 0, y: 0, w: 1080, h, cutout: true, cover: true }]
        : [];
      return { format, styleId: 'word-behind', background: { ...photo, focusX: 0.5, focusY: 0.5 }, layers, images };
    },
  },
  {
    id: 'mono-studio',
    name: 'Mono Studio',
    family: 'mono',
    description: 'Person, product and backdrop all in one colour',
    colors: { main: '#F97316', ink: '#FFFFFF', accent: '#FFFFFF' },
    example: { headline: 'Nova 7 Pro', kicker: 'New era · New model', footer: 'Your Brand' },
    imagePrompt: (idea, c) =>
      `High-end advertising photo where everything is one saturated colour, ${c.main}: a seamless studio backdrop and floor in that colour, a chair in that colour, and a stylish person in white and ${c.main} clothes ` +
      `showing off this: "${idea}", holding it toward the camera with a wide-angle lens. Bold commercial lighting. The upper right of the frame is empty backdrop for a headline. ` +
      `Any product is plain and unbranded. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const ink = bestTextColor(photo.tones, ['#FFFFFF', '#0B0B0F']);
      const layers: TextLayer[] = [
        text({ id: 'headline', role: 'headline', text: t.headline, x: 1080 * 0.42, y: M, width: 1080 * 0.58 - M, height: h * 0.26, size: 150, font: 'archivo', color: ink, align: 'right', lineHeight: 0.92, uppercase: true, letterSpacing: -0.01 }),
      ];
      if (t.kicker) layers.push(text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: M, width: 1080 * 0.36, height: 50, size: 26, weight: 700, color: ink, uppercase: true, letterSpacing: 0.06 }));
      if (t.footer) layers.push(text({ id: 'footer', role: 'footer', text: t.footer, x: M, y: h - M - 50, width: 1080 / 2, height: 50, size: 32, weight: 700, color: ink }));
      void colors;
      return { format, styleId: 'mono-studio', background: { ...photo, focusX: 0.5, focusY: 0.5 }, layers };
    },
  },
];

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);
