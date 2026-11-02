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


/* Shared pieces for the recipes below */

/** A small line in a corner */
const corner = (id: string, role: TextLayer['role'], value: string | undefined, where: 'tl' | 'tr' | 'bl' | 'br', h: number, color: string, size = 28) =>
  value
    ? [
        text({
          id,
          role,
          text: value,
          x: where.endsWith('l') ? M : 1080 / 2,
          y: where.startsWith('t') ? M - 20 : h - M - 40,
          width: 1080 / 2 - M,
          height: 50,
          size,
          weight: 700,
          color,
          align: where.endsWith('l') ? 'left' : 'right',
        }),
      ]
    : [];

/** A rounded button-like pill ("Shop now"), its text always readable on its fill */
const pill = (id: string, value: string | undefined, x: number, y: number, fill: string, width = 360, size = 34) =>
  value ? [text({ id, role: 'pill', text: value, x, y, width, height: size * 2.2, size, weight: 800, fill, color: bestTextColor([fill], ['#0B0B0F', '#FFFFFF']) })] : [];

/** A full-width bar along the bottom: the brand, its handle, phone or website */
const contactBar = (value: string | undefined, h: number, fill: string) =>
  value ? [text({ id: 'footer', role: 'pill', text: value, x: M / 2, y: h - M - 70, width: 1080 - M, height: 96, size: 30, weight: 700, fill, color: bestTextColor([fill], ['#0B0B0F', '#FFFFFF']), align: 'center' })] : [];

/** A row of up to 3 short features ("A16 chip · All-day battery · 11-inch screen") */
const featureRow = (value: string | undefined, h: number, color: string) => {
  const parts = (value ?? '').split(/\s*[·|•]\s*/).filter(Boolean).slice(0, 3);
  const w = (1080 - M * 2) / Math.max(parts.length, 1);
  return parts.map((part, i) => text({ id: `feature${i}`, role: 'body', text: part, x: M + i * w, y: h - M - 70, width: w - 16, height: 70, size: 26, weight: 600, color, align: 'center', lineHeight: 1.2 }));
};

const photoBg = (photo: PhotoBackground) => ({ ...photo, focusX: 0.5, focusY: 0.5 });

const cutoutLayer = (cutout: { photoId: string; width: number; height: number } | undefined, h: number): ImageLayer[] =>
  cutout ? [{ id: 'subject', photoId: cutout.photoId, width: cutout.width, height: cutout.height, x: 0, y: 0, w: 1080, h, cutout: true, cover: true }] : [];

/** Text colour that reads on the photo's tones */
const inkOn = (photo: PhotoBackground, prefer = '#FFFFFF') => bestTextColor(photo.tones, [prefer, prefer === '#FFFFFF' ? '#0B0B0F' : '#FFFFFF']);

const flat = (c: string) => `Perfectly flat, solid, seamless background in one colour, exactly ${c}`;

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

  // ——— Cutout on colour ———
  {
    id: 'blueprint-thinker',
    name: 'Blueprint Thinker',
    family: 'cutout',
    description: 'A marble statue on a dark grid, one phrase highlighted',
    colors: { main: '#0B0B0F', ink: '#FFFFFF', accent: '#1D4ED8' },
    example: { headline: 'Your brand deserves', kicker: 'better content', body: 'and this is where that begins', footer: 'Your Brand' },
    imagePrompt: (idea, c) =>
      `Advertising poster photo: a classical white marble statue of a thoughtful bearded philosopher, acting out this idea: "${idea}", with a thin white sticker-like outline around it, in the lower right of the frame. ` +
      `Background: ${c.main} with a thin, even, light grey square grid like graph paper. Large empty area in the upper left. Crisp studio light. Any object is plain and unbranded. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'blueprint-thinker',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tr', h, colors.ink),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 120, width: 1080 * 0.6, height: h * 0.22, size: 110, font: 'serif', weight: 400, color: colors.ink, lineHeight: 1.0 }),
          ...pill('kicker', t.kicker, M - 10, M + 120 + h * 0.22, colors.accent, 1080 * 0.62, 70),
          ...(t.body ? [text({ id: 'body', role: 'body', text: t.body, x: M, y: M + 170 + h * 0.22 + 160, width: 1080 * 0.42, height: 120, size: 40, weight: 600, color: colors.ink, lineHeight: 1.15 })] : []),
        ],
      };
    },
  },
  {
    id: 'sticker-portrait',
    name: 'Sticker Portrait',
    family: 'cutout',
    description: 'A big-head caricature with a sticker outline and callouts',
    colors: { main: '#1E3A5F', ink: '#FFFFFF', accent: '#F97316' },
    example: { headline: 'Social media manager', body: 'Trend obsessed · Always saving ideas · Lives in the comments', footer: 'Your Brand' },
    imagePrompt: (idea, c) =>
      `A playful 3D caricature illustration of one smiling person with a slightly oversized head, styled to show this idea: "${idea}", holding the props of their work, with a thick white sticker outline around the whole figure, centred and full length. ` +
      `${flat(c.main)} with a soft vignette. Lots of empty space at the top and both sides. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const notes = (t.body ?? '').split(/\s*[·|•]\s*/).filter(Boolean).slice(0, 3);
      const spots: [number, number, TextLayer['align']][] = [[M, h * 0.3, 'left'], [1080 * 0.62, h * 0.45, 'right'], [1080 * 0.62, h * 0.66, 'right']];
      return {
        format,
        styleId: 'sticker-portrait',
        background: photoBg(photo),
        layers: [
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M, width: 1080 - M * 2, height: h * 0.15, size: 96, font: 'bebas', weight: 400, color: colors.ink, align: 'center', uppercase: true, lineHeight: 0.95 }),
          ...notes.map((n, i) => text({ id: `note${i}`, role: 'body', text: n, x: spots[i][0], y: spots[i][1], width: 1080 * 0.3, height: 110, size: 32, weight: 700, color: colors.ink, align: spots[i][2], lineHeight: 1.15 })),
          ...corner('footer', 'footer', t.footer, 'bl', h, colors.ink),
        ],
      };
    },
  },
  {
    id: 'collage-zine',
    name: 'Collage Zine',
    family: 'cutout',
    description: 'Cut-paper collage on cream, with a script word on top',
    colors: { main: '#FBF7EE', ink: '#2B2B2B', accent: '#5B21B6' },
    example: { kicker: 'When your', headline: 'Social Media Manager', body: 'is a Gen Z…', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `A witty paper-collage photo: one person from the waist up whose head is replaced by an object that tells this idea: "${idea}" (for example an old TV set, a speaker or a camera), cut out like a magazine clipping with a slight paper edge, ` +
      `standing in the lower middle on a plain cream recycled-paper background with soft texture. Large empty space at the top. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'collage-zine',
        background: photoBg(photo),
        layers: [
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: M, width: 1080 - M * 2, height: 110, size: 90, font: 'script', weight: 400, color: '#DC2626', align: 'center' })] : []),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 100, width: 1080 - M * 2, height: h * 0.26, size: 150, font: 'archivo', color: colors.ink, align: 'center', lineHeight: 0.92 }),
          ...(t.body ? [text({ id: 'body', role: 'body', text: t.body, x: 1080 * 0.3, y: h * 0.48, width: 1080 * 0.4, height: 90, size: 52, font: 'bebas', weight: 400, color: '#DC2626', align: 'center', uppercase: true })] : []),
          ...corner('footer', 'footer', t.footer, 'br', h, colors.ink),
        ],
      };
    },
  },

  // ——— One-colour hero ———
  {
    id: 'neon-lime',
    name: 'Neon Lime Set',
    family: 'mono',
    description: 'Fresh lime green, a hero product and a Shop Now button',
    colors: { main: '#A3E635', ink: '#14532D', accent: '#FFFFFF' },
    example: { headline: 'Level up your gadgets', kicker: 'Shop now', footer: 'Your Brand' },
    imagePrompt: (idea, c) =>
      `Vibrant advertising photo in fresh lime green (${c.main}) tones: a confident person in lime-green clothes holding a large unbranded product that shows this idea: "${idea}" toward the camera, ` +
      `with a few floating translucent glass cubes and soft circular light rings around them, on a lime green gradient studio background. The top third is clear background for a headline. Bright, glossy commercial light. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const ink = inkOn(photo, colors.ink);
      return {
        format,
        styleId: 'neon-lime',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tl', h, ink),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 70, width: 1080 - M * 2, height: h * 0.2, size: 110, font: 'jakarta', weight: 800, color: ink, align: 'center', lineHeight: 1.0, letterSpacing: -0.02 }),
          ...pill('kicker', t.kicker, (1080 - 320) / 2, h - M - 110, colors.accent, 320),
        ],
      };
    },
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue Retail',
    family: 'mono',
    description: 'Bright blue, tight white headline, contact bar for orders',
    colors: { main: '#1D6FF2', ink: '#FFFFFF', accent: '#FFFFFF' },
    example: { headline: 'Hold greatness', kicker: 'Simply premium', footer: 'Order now · 0901 234 5678 · @yourbrand' },
    imagePrompt: (idea, c) =>
      `Bold retail advertising photo in electric blue (${c.main}): a hand or a stylish person holding an unbranded product that shows this idea: "${idea}", large in the right half of the frame, ` +
      `on a smooth bright blue studio gradient. The left half and the bottom are clear for text. Crisp, high-contrast light. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'electric-blue',
        background: photoBg(photo),
        layers: [
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 40, width: 1080 * 0.55, height: h * 0.34, size: 150, font: 'jakarta', weight: 800, color: colors.ink, lineHeight: 0.9, letterSpacing: -0.05 }),
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: M + 60 + h * 0.34, width: 1080 * 0.45, height: 60, size: 32, weight: 600, color: '#A3E635' })] : []),
          ...contactBar(t.footer, h, colors.accent),
        ],
      };
    },
  },
  {
    id: 'brand-red',
    name: 'Brand Red Offers',
    family: 'mono',
    description: 'Deep red, a bold 3D object, a big offer',
    colors: { main: '#B91C1C', ink: '#FFFFFF', accent: '#FFFFFF' },
    example: { headline: 'No buffering, just fast internet', kicker: 'Offer ends soon', body: 'T&C apply', footer: 'Your Brand' },
    imagePrompt: (idea, c) =>
      `Glossy 3D advertising render: one large, smooth, shiny red object that symbolises this idea: "${idea}" (for example a gift box, a swirl, a speech bubble or a giant device), ` +
      `with one or two small happy people sitting or standing on it, on a deep red (${c.main}) to dark red gradient background. The top third is clear for a headline. Studio lighting, soft reflections. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'brand-red',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tl', h, colors.ink),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 70, width: 1080 - M * 2, height: h * 0.2, size: 100, font: 'jakarta', weight: 800, color: colors.ink, align: 'center', lineHeight: 1.0, letterSpacing: -0.02 }),
          ...(t.kicker ? pill('kicker', t.kicker, (1080 - 380) / 2, M + 90 + h * 0.2, colors.accent, 380, 30) : []),
          ...corner('body', 'body', t.body, 'br', h, colors.ink, 24),
        ],
      };
    },
  },

  // ——— Giant word ———
  {
    id: 'glow-numeral',
    name: 'Glow Numeral',
    family: 'giant-word',
    description: 'A huge glowing number behind the person, features below',
    colors: { main: '#E0F2FE', ink: '#FFFFFF', accent: '#38BDF8' },
    cutout: 'green',
    example: { headline: '11 Series', body: 'Health tracking · Always-on display · Fast charging', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `Moody premium advertising photo on a dark navy-blue background with a soft blue glow: one stylish person holding an unbranded product that shows this idea: "${idea}" toward the camera, ` +
      `centred, upper body, with empty dark space above and around their head. Cinematic blue rim light. The person wears nothing bright green. ${NO_TEXT}`,
    build({ text: t, format, photo, cutout, colors }) {
      const h = FORMATS[format].height;
      const big = giantWord(t.headline);
      return {
        format,
        styleId: 'glow-numeral',
        background: photoBg(photo),
        layers: [
          text({ id: 'headline', role: 'headline', text: big, x: 30, y: h * 0.06, width: 1020, height: h * 0.34, size: 400, font: 'jakarta', weight: 800, color: colors.main, align: 'center', valign: 'middle', lineHeight: 0.9, letterSpacing: -0.06, behind: true }),
          ...(afterGiant(t.headline) ? [text({ id: 'kicker', role: 'kicker', text: afterGiant(t.headline), x: 1080 * 0.62, y: h * 0.3, width: 1080 * 0.3, height: 60, size: 40, weight: 600, color: colors.ink })] : []),
          ...corner('footer', 'footer', t.footer, 'tl', h, colors.ink),
          ...featureRow(t.body, h, colors.ink),
        ],
        images: cutoutLayer(cutout, h),
      };
    },
  },
  {
    id: 'while-others-blur',
    name: 'While Others Blur',
    family: 'giant-word',
    description: 'One sharp person in a blurred crowd, a bold word behind',
    colors: { main: '#FACC15', ink: '#FFFFFF', accent: '#FACC15' },
    cutout: 'green',
    example: { headline: 'Blur', kicker: 'While others', body: 'We make you clear', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `Cinematic photo: one person in sharp focus in the centre, calm and looking at the camera, doing something that shows this idea: "${idea}", surrounded by a dense crowd in heavy motion blur, warm dark tones. ` +
      `Upper body, empty blurred space above their head. Moody, high-end film look. The person wears nothing bright green. ${NO_TEXT}`,
    build({ text: t, format, photo, cutout, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'while-others-blur',
        background: photoBg(photo),
        layers: [
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: h * 0.17, width: 1080 - M * 2, height: 80, size: 60, weight: 600, color: colors.main, align: 'center' })] : []),
          text({ id: 'headline', role: 'headline', text: giantWord(t.headline).toUpperCase(), x: 40, y: h * 0.22, width: 1000, height: h * 0.2, size: 300, font: 'archivo', color: colors.main, align: 'center', valign: 'middle', lineHeight: 0.9, behind: true }),
          ...(t.body ? [text({ id: 'body', role: 'body', text: t.body, x: M, y: h * 0.42, width: 1080 - M * 2, height: 70, size: 48, weight: 600, color: colors.ink, align: 'center' })] : []),
          ...corner('footer', 'footer', t.footer, 'bl', h, colors.ink),
        ],
        images: cutoutLayer(cutout, h),
      };
    },
  },

  // ——— Premium product ———
  {
    id: 'sky-product',
    name: 'Sky Product',
    family: 'premium',
    description: 'A product held up against a soft blue sky',
    colors: { main: '#93C5FD', ink: '#0B1C30', accent: '#FFFFFF' },
    example: { kicker: 'Introducing', headline: 'Tablet 11th Gen', body: 'Powerful chip · All-day battery · 11-inch screen', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `Clean premium product photo: a hand holding up an unbranded product that shows this idea: "${idea}", in the middle of the frame, against a soft pastel blue sky with a few light clouds and a gentle warm glow near the bottom. ` +
      `Top quarter clear for a headline. Soft natural light. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const ink = inkOn(photo, colors.ink);
      return {
        format,
        styleId: 'sky-product',
        background: photoBg(photo),
        layers: [
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: M + 10, width: 1080 - M * 2, height: 70, size: 54, weight: 400, color: ink, align: 'center' })] : []),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 80, width: 1080 - M * 2, height: h * 0.12, size: 100, font: 'jakarta', weight: 800, color: ink, align: 'center', lineHeight: 1.0, letterSpacing: -0.03 }),
          ...featureRow(t.body, h, ink),
          ...corner('footer', 'footer', t.footer, 'tr', h, ink, 24),
        ],
      };
    },
  },
  {
    id: 'dark-luxe',
    name: 'Dark Luxe',
    family: 'premium',
    description: 'Near-black and moody, a light headline and a glass tag',
    colors: { main: '#0B0B0F', ink: '#FFFFFF', accent: '#3F3F46' },
    example: { headline: 'Nova 15 Plus', kicker: '256 GB', body: 'Aerospace-grade finish', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `Moody luxury advertising photo, almost black: a person in a dark jacket holding an unbranded product that shows this idea: "${idea}" close to the camera, lit by a single soft side light, deep shadows. ` +
      `The right half has dark empty space for text. Rich, cinematic, minimal. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'dark-luxe',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tl', h, colors.ink, 24),
          text({ id: 'headline', role: 'headline', text: t.headline, x: 1080 * 0.48, y: h * 0.38, width: 1080 * 0.52 - M, height: h * 0.18, size: 110, font: 'jakarta', weight: 400, color: colors.ink, lineHeight: 0.98, letterSpacing: -0.03 }),
          ...pill('kicker', t.kicker, 1080 * 0.48, h * 0.38 + h * 0.18 + 10, colors.accent, 240, 28),
          ...corner('body', 'body', t.body, 'br', h, colors.ink, 24),
        ],
      };
    },
  },

  // ——— Campaign and celebration ———
  {
    id: 'celebration-script',
    name: 'Celebration Script',
    family: 'celebration',
    description: 'A playful family moment, a big word and a script word over it',
    colors: { main: '#1E3A8A', ink: '#FFFFFF', accent: '#F43F5E' },
    example: { headline: 'Papa', kicker: 'happy day', body: 'Thank you for every adventure', footer: 'Your Brand · @yourbrand' },
    imagePrompt: (idea, c) =>
      `Joyful, playful studio photo for a celebration campaign about this idea: "${idea}": a family or friends having fun together with simple props, warm genuine smiles, on a solid colour studio set in ${c.main} tones. ` +
      `People in the upper and middle part of the frame, the bottom third clear for big words. Bright, clean commercial light. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const word = t.headline.toUpperCase();
      return {
        format,
        styleId: 'celebration-script',
        background: photoBg(photo),
        layers: [
          ...(t.body ? [text({ id: 'body', role: 'body', text: t.body, x: M, y: M, width: 1080 * 0.4, height: 140, size: 30, weight: 600, color: colors.ink, lineHeight: 1.2 })] : []),
          text({ id: 'headline', role: 'headline', text: word, x: M, y: h * 0.62, width: 1080 - M * 2, height: h * 0.2, size: 260, font: 'archivo', color: colors.ink, align: 'center', valign: 'middle', lineHeight: 0.9 }),
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M, y: h * 0.62 + h * 0.13, width: 1080 - M * 2, height: h * 0.1, size: 130, font: 'script', weight: 400, color: colors.accent, align: 'center' })] : []),
          ...contactBar(t.footer, h, colors.main),
        ],
      };
    },
  },

  // ——— Big idea ———
  {
    id: 'reach-out',
    name: 'Reach Out',
    family: 'big-idea',
    description: 'A person reaching to the camera, a bold orange ticket',
    colors: { main: '#F97316', ink: '#FFFFFF', accent: '#F97316' },
    example: { headline: 'We make your brand impossible to ignore.', kicker: "Let's build your growth story.", footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `Dynamic advertising photo in a clean white room: a friendly person reaching one open hand toward the camera with a strong wide-angle perspective so the hand looks huge and slightly blurred, about this idea: "${idea}". ` +
      `Orange accent stripes on the white floor. The lower half of the frame has clear space in front of them. Bright, clean light. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'reach-out',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tl', h, '#0B0B0F'),
          text({ id: 'headline', role: 'pill', text: t.headline.toUpperCase(), x: M, y: h * 0.58, width: 1080 * 0.72, height: h * 0.3, size: 96, font: 'archivo', fill: colors.main, color: bestTextColor([colors.main], ['#FFFFFF', '#0B0B0F']), lineHeight: 0.95 }),
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: 1080 * 0.6, y: h * 0.28, width: 1080 * 0.34, height: 160, size: 54, font: 'script', weight: 400, color: '#0B0B0F', lineHeight: 1.05 })] : []),
        ],
      };
    },
  },
  {
    id: 'sharp-in-crowd',
    name: 'Sharp in the Crowd',
    family: 'big-idea',
    description: 'Black-and-white crowd, one person stands out',
    colors: { main: '#FFFFFF', ink: '#0B0B0F', accent: '#1D4ED8' },
    example: { headline: 'Be the brand all notice', kicker: 'they', body: 'powered by creative excellence', footer: '@yourbrand' },
    imagePrompt: (idea) =>
      `Black and white editorial photo: a crowd of people seen from behind fills the lower two thirds, and one person in the centre faces the camera, calm and confident, about this idea: "${idea}". ` +
      `Only one small detail on that person is in colour (for example warm amber sunglasses). The top third is plain bright white for a headline. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'sharp-in-crowd',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tl', h, colors.accent, 24),
          // The script word sits just above the headline's first line, overlapping it a little
          ...(t.kicker ? [text({ id: 'kicker', role: 'kicker', text: t.kicker, x: M + 20, y: h * 0.07, width: 1080 * 0.4, height: 120, size: 100, font: 'script', weight: 400, color: colors.accent })] : []),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: h * 0.14, width: 1080 - M * 2, height: h * 0.16, size: 110, font: 'jakarta', weight: 800, color: colors.ink, align: 'center', lineHeight: 0.98, letterSpacing: -0.03 }),
          ...corner('body', 'body', t.body, 'tr', h, colors.ink, 24),
        ],
      };
    },
  },
  {
    id: '3d-crew',
    name: '3D Crew',
    family: 'big-idea',
    description: 'A joyful 3D cartoon group, a clean headline and a button',
    colors: { main: '#FFFFFF', ink: '#0B1C30', accent: '#0B1C30' },
    example: { headline: 'Find your tribe, build your network', kicker: 'Join for free', footer: 'Your Brand' },
    imagePrompt: (idea) =>
      `A joyful Pixar-style 3D animated group selfie of diverse friendly young people, big smiles, pointing and waving, about this idea: "${idea}", filling the bottom 60% of the frame, ` +
      `on a plain clean white background. The top 40% is empty white for a headline. Bright, soft, colourful. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: '3d-crew',
        background: photoBg(photo),
        layers: [
          ...corner('footer', 'footer', t.footer, 'tl', h, colors.ink, 26),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 60, width: 1080 - M * 2, height: h * 0.17, size: 100, font: 'jakarta', weight: 800, color: colors.ink, align: 'center', lineHeight: 1.02, letterSpacing: -0.03 }),
          ...pill('kicker', t.kicker, (1080 - 340) / 2, M + 80 + h * 0.17, colors.accent, 340, 30),
        ],
      };
    },
  },

  // ——— Highlight and flyer ———
  {
    id: 'marker-highlight',
    name: 'Marker Highlight',
    family: 'flyer',
    description: 'Grid paper, a marker-highlighted word, a striking portrait',
    colors: { main: '#FAFAFA', ink: '#0B0B0F', accent: '#FDE047' },
    example: { headline: 'What great founders know about marketing', kicker: 'founders', body: 'That most businesses ignore', footer: 'Share it →' },
    imagePrompt: (idea) =>
      `Editorial collage on white grid paper: a striking low-poly geometric portrait of a confident made-up business person (not a real or famous person) in the lower right, ` +
      `and a hand holding a small glass jar of gold coins in the lower left, about this idea: "${idea}". The top half is empty grid paper for a headline. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      return {
        format,
        styleId: 'marker-highlight',
        background: photoBg(photo),
        layers: [
          ...pill('kicker', t.kicker, M - 10, M + 40, colors.accent, 1080 * 0.5, 64),
          text({ id: 'headline', role: 'headline', text: t.headline, x: M, y: M + 200, width: 1080 - M * 2, height: h * 0.2, size: 90, font: 'jakarta', weight: 800, color: colors.ink, lineHeight: 1.05, letterSpacing: -0.02 }),
          ...(t.body ? [text({ id: 'body', role: 'body', text: t.body, x: 1080 * 0.42, y: M + 220 + h * 0.2, width: 1080 * 0.58 - M, height: 70, size: 40, weight: 400, color: colors.ink, align: 'right' })] : []),
          ...corner('footer', 'footer', t.footer, 'bl', h, colors.ink, 34),
        ],
      };
    },
  },
  {
    id: 'street-flyer',
    name: 'Street Flyer',
    family: 'flyer',
    description: 'A bold street-style flyer with a contact strip',
    colors: { main: '#FED7AA', ink: '#EA580C', accent: '#0B1C30' },
    example: { headline: 'Sport your style', kicker: 'Order now', footer: '@yourbrand · 0851 234 5678 · yourbrand.com' },
    imagePrompt: (idea, c) =>
      `Energetic street-style advertising photo: a young person in bright orange clothes striking a dynamic pose, one chunky boot kicked toward the camera with a wide-angle lens, holding an unbranded product that shows this idea: "${idea}", ` +
      `on a warm peach (${c.main}) studio background with soft light. Clear space on both sides of the person. ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = FORMATS[format].height;
      const words = t.headline.trim().split(/\s+/);
      const left = words.slice(0, Math.ceil(words.length / 2)).join('\n');
      const right = words.slice(Math.ceil(words.length / 2)).join('\n');
      return {
        format,
        styleId: 'street-flyer',
        background: photoBg(photo),
        layers: [
          text({ id: 'headline', role: 'headline', text: left, x: M - 30, y: h * 0.14, width: 1080 * 0.36, height: h * 0.5, size: 160, font: 'anton', weight: 400, color: colors.ink, lineHeight: 0.88, uppercase: true, behind: true }),
          ...(right ? [text({ id: 'body', role: 'body', text: right, x: 1080 * 0.64, y: h * 0.14, width: 1080 * 0.36 - M + 30, height: h * 0.5, size: 160, font: 'anton', weight: 400, color: colors.ink, align: 'right', lineHeight: 0.88, uppercase: true, behind: true })] : []),
          ...pill('kicker', t.kicker, (1080 - 340) / 2, h - M - 200, colors.accent, 340, 30),
          ...contactBar(t.footer, h, '#FFFFFF'),
        ],
      };
    },
  },

];

export const recipeById = (id: string) => RECIPES.find((r) => r.id === id);
