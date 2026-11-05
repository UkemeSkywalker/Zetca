/**
 * Style families: styles with several layouts that share one look (fonts,
 * colours, shapes), so a campaign can mix them post by post and still look
 * like one series. Also the newer single-layout styles.
 *
 * Copy the style, never the brand: no real logos, names or people.
 */

import { bestTextColor } from './contrast';
import type { ShapeLayer, TextLayer } from './types';
import {
  castLine,
  design,
  obj,
  flat,
  giantWord,
  heightOf,
  inkOn,
  items,
  keepOff,
  lighten,
  M,
  markup,
  NO_TEXT,
  pageWithSubject,
  photoBg,
  pill,
  plain,
  readable,
  rich,
  sameColors,
  shape,
  text,
  W,
  type BuildInput,
  type Cast,
  type Colors,
  type RecipeLayout,
  type RecipeText,
  type StyleRecipe,
} from './recipeKit';

/** A style from its layouts: the first layout is also the recipe's own */
function family(r: Omit<StyleRecipe, 'imagePrompt' | 'build' | 'example' | 'cutout'> & { layouts: RecipeLayout[] }): StyleRecipe {
  const first = r.layouts[0];
  return { ...r, imagePrompt: first.imagePrompt, build: first.build, example: first.example, cutout: first.cutout };
}

/** A small text line */
const line = (id: string, role: TextLayer['role'], value: string | undefined, x: number, y: number, width: number, height: number, size: number, color: string, more: Partial<TextLayer> = {}): TextLayer[] =>
  value ? [text({ id, role, text: plain(value)!, x, y, width, height, size, weight: 600, color, lineHeight: 1.2, ...more })] : [];

/** Words before, inside and after the first accent (`*…*`), for layouts that split a headline around it */
function aroundAccent(raw: string): { before: string; accent: string; after: string } {
  const m = markup(raw);
  const words = m.text.split(/\s+/).filter(Boolean);
  const [from, to] = m.accent[0] ?? (words.length >= 3 ? [1, words.length - 1] : [words.length, words.length]);
  return { before: words.slice(0, from).join(' '), accent: words.slice(from, to).join(' '), after: words.slice(to).join(' ') };
}

/* ———————————————————————— A. Frame & Bubble ———————————————————————— */

const FB_GREEN = '#1F9D55';
// A coral deep enough for white headlines (3.2:1, large text)
const FB_OWN: Colors = { main: '#E9674E', ink: '#FFFFFF', accent: '#EF5A2B' };

const fbPhoto = (idea: string, where: string, k?: Cast) =>
  `Warm, candid lifestyle photo about this idea: "${idea}". Real people in a cosy, sunlit place that fits the idea (for example a modern studio with plants and wooden desks), soft window light, warm orange and coral tones, shallow depth of field. ${where}${castLine(k)} ` +
  `${k?.object ? `${k.object} is clearly in the scene. ` : ''}Any laptop, screen, phone or product is plain and unbranded. ${NO_TEXT}`;

/** The thin rounded frame, the hashtag, the name and the "Speak to us" button every Frame & Bubble post has */
function fbChrome(t: RecipeText, h: number, colors: Colors): { layers: TextLayer[]; shapes: ShapeLayer[] } {
  const cta = sameColors(colors, FB_OWN) ? FB_GREEN : colors.accent;
  return {
    shapes: [
      shape({ id: 'top-fade', kind: 'fade', x: 0, y: 0, w: W, h: h * 0.18, fill: '#000000', opacity: 0.35, flip: true }),
      shape({ id: 'bottom-fade', kind: 'fade', x: 0, y: h * 0.74, w: W, h: h * 0.26, fill: '#000000', opacity: 0.6 }),
      shape({ id: 'frame', kind: 'frame', x: 36, y: 36, w: W - 72, h: h - 72, radius: 56, stroke: '#FFFFFF', strokeWidth: 3, opacity: 0.85, front: true }),
    ],
    layers: [
      ...line('kicker', 'kicker', t.kicker, M, M - 14, W * 0.5, 44, 26, '#FFFFFF'),
      ...line('footer', 'footer', t.footer, M, h - M - 66, W * 0.5, 60, 28, '#FFFFFF', { weight: 800 }),
      ...pill('cta', t.cta ?? 'Speak to us', W - M - 300, h - M - 70, cta, 300, 24, 'right'),
    ],
  };
}

const fbExample = (e: Omit<RecipeText, 'footer' | 'kicker' | 'cta'>): RecipeText => ({ kicker: '#brandclarity', footer: 'Northbeam Studio', cta: 'Speak to us', ...e });

const FRAME_BUBBLE = family({
  id: 'frame-bubble',
  name: 'Frame & Bubble',
  family: 'series',
  description: 'Warm photos in a rounded frame, with speech-bubble headlines',
  colors: FB_OWN,
  wordsHint: 'Mark the 1-2 most important words of the headline with asterisks, like "We build brands from *anywhere*". Keep the headline under 9 words.',
  layouts: [
    {
      id: 'bubble',
      name: 'Bubble in the corner',
      example: fbExample({ headline: 'We build brands from *anywhere.*' }),
      imagePrompt: (idea, _c, k) => fbPhoto(idea, 'One person works at a desk in the left half of the frame; the lower right of the frame is calm and uncluttered.', k),
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const c = fbChrome(t, h, colors);
        const b = { x: W * 0.4, y: h * 0.52, w: W * 0.6 - M + 20, h: h * 0.22 };
        return design('frame-bubble', 'bubble', format, colors, {
          background: photoBg(photo),
          shapes: [...c.shapes, shape({ id: 'bubble', kind: 'bubble', ...b, radius: 40, fill: colors.main, tail: 'bl' })],
          layers: [rich({ id: 'headline', role: 'headline', x: b.x + 44, y: b.y + 34, width: b.w - 88, height: b.h - 68, size: 76, weight: 600, color: colors.ink, align: 'right', valign: 'middle' }, t.headline, { italic: true, bold: true, fallback: 1 }), ...c.layers],
        });
      },
    },
    {
      id: 'split',
      name: 'Split card on top',
      example: fbExample({ headline: 'Stuck alone? Solved together.', body: 'When the strategy stalls, a second mind sees what yours *can’t.*' }),
      imagePrompt: (idea, _c, k) => fbPhoto(idea, 'Two or three people work together in the lower half of the frame; the top 40% is soft, blurred background.', k),
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const c = fbChrome(t, h, colors);
        const y = h * 0.13;
        const ch = h * 0.24;
        const leftW = W * 0.5;
        return design('frame-bubble', 'split', format, colors, {
          background: photoBg(photo),
          shapes: [
            ...c.shapes,
            shape({ id: 'card-right', kind: 'rect', x: M - 14 + leftW - 40, y, w: W - M * 2 + 28 - leftW + 40, h: ch, radius: 40, fill: colors.accent }),
            shape({ id: 'card-left', kind: 'bubble', x: M - 14, y, w: leftW, h: ch, radius: 40, fill: colors.main, tail: 'right' }),
          ],
          layers: [
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M + 26, y: y + 30, width: leftW - 90, height: ch - 60, size: 70, weight: 800, color: colors.ink, valign: 'middle', lineHeight: 1.02 }),
            ...(t.body ? [rich({ id: 'body', role: 'body', x: M + leftW + 20, y: y + 30, width: W - M * 2 - leftW - 40, height: ch - 60, size: 34, weight: 400, color: readable(colors.ink, colors.accent), valign: 'middle', lineHeight: 1.25, italic: true }, t.body, { bold: true, fallback: 1 })] : []),
            ...c.layers,
          ],
        });
      },
    },
    {
      id: 'sticker',
      name: 'Sticker',
      example: fbExample({ headline: 'Happy New Week', body: 'Follow up with that lead.' }),
      imagePrompt: (idea, _c, k) => fbPhoto(idea, 'Seen from above: a desk with people waving at a video call; the lower right of the frame is a plain part of the wooden desk.', k),
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const c = fbChrome(t, h, colors);
        const b = { x: W * 0.5, y: h * 0.52, w: W * 0.5 - M, h: h * 0.3 };
        return design('frame-bubble', 'sticker', format, colors, {
          background: photoBg(photo),
          shapes: [
            ...c.shapes,
            shape({ id: 'sticker', kind: 'bubble', ...b, radius: 44, fill: colors.accent, tail: 'tl' }),
            ...(t.body ? [shape({ id: 'bar', kind: 'rect', x: b.x + 40, y: b.y + b.h * 0.66, w: 8, h: b.h * 0.22, radius: 4, fill: sameColors(colors, FB_OWN) ? FB_GREEN : colors.ink })] : []),
          ],
          layers: [
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: b.x + 40, y: b.y + 34, width: b.w - 80, height: b.h * 0.58, size: 96, weight: 800, color: readable(colors.ink, colors.accent), valign: 'middle', lineHeight: 0.98 }),
            ...line('body', 'body', t.body, b.x + 62, b.y + b.h * 0.66, b.w - 102, b.h * 0.24, 28, readable(colors.ink, colors.accent), { valign: 'middle' }),
            ...c.layers,
          ],
        });
      },
    },
    {
      id: 'banner',
      name: 'Banner and list',
      example: fbExample({ headline: 'Your workspace?\nThat’s your *safe haven!*', body: 'Every breakthrough · Every doubt · Every deadline survived' }),
      imagePrompt: (idea, _c, k) => fbPhoto(idea, 'A workspace scene fills the lower 70% of the frame; the top 30% is a plain soft wall.', k),
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const c = fbChrome(t, h, colors);
        const list = items(t.body, 3);
        const b = { x: W * 0.54, y: h * 0.64, w: W * 0.46 - M + 6, h: h * 0.18 };
        return design('frame-bubble', 'banner', format, colors, {
          background: photoBg(photo),
          shapes: [
            shape({ id: 'banner', kind: 'bubble', x: 0, y: 0, w: W, h: h * 0.32, radius: 0, fill: colors.accent, tail: 'bl' }),
            ...c.shapes.filter((s) => s.id !== 'top-fade'),
            ...(list.length ? [shape({ id: 'list', kind: 'bubble', ...b, radius: 32, fill: colors.main, tail: 'tl' })] : []),
          ],
          layers: [
            rich({ id: 'headline', role: 'headline', x: M, y: M + 30, width: W - M * 2, height: h * 0.32 - M - 70, size: 66, weight: 800, color: readable(colors.ink, colors.accent), align: 'center', valign: 'middle', lineHeight: 1.1 }, t.headline, { italic: true, fallback: 0 }),
            ...list.map((it, i) => text({ id: `item${i}`, role: 'body', text: it, x: b.x + 36, y: b.y + 26 + i * ((b.h - 52) / list.length), width: b.w - 72, height: (b.h - 52) / list.length, size: 28, weight: 600, italic: true, color: colors.ink, valign: 'middle' })),
            ...c.layers,
          ],
        });
      },
    },
    {
      id: 'quote',
      name: 'Quote card',
      example: fbExample({ headline: 'Clarity beats noise, every single time.', body: 'Northbeam Studio' }),
      imagePrompt: (idea, _c, k) => fbPhoto(idea, 'A calm, simple scene with lots of soft space.', k),
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const c = fbChrome(t, h, colors);
        return design('frame-bubble', 'quote', format, colors, {
          background: photoBg(photo),
          overlay: { color: colors.main, opacity: 0.86 },
          shapes: c.shapes.filter((s) => s.kind === 'frame'),
          layers: [
            text({ id: 'mark', role: 'kicker', text: '“', x: M, y: h * 0.16, width: 200, height: 200, size: 220, font: 'serif', weight: 400, color: colors.accent }),
            rich({ id: 'headline', role: 'headline', x: M, y: h * 0.3, width: W - M * 2, height: h * 0.32, size: 92, weight: 800, color: colors.ink, lineHeight: 1.04, letterSpacing: -0.02 }, t.headline, { italic: true, fallback: 0 }),
            ...line('body', 'body', t.body, M, h * 0.64, W - M * 2, 60, 30, colors.ink, { italic: true, weight: 400 }),
            ...c.layers,
          ],
        });
      },
    },
    {
      id: 'photo',
      name: 'Full photo, small bubble',
      example: fbExample({ headline: 'Good brands are built, not born.' }),
      imagePrompt: (idea, _c, k) => fbPhoto(idea, 'The person is in the right half of the frame; the upper left is soft, out-of-focus background.', k),
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const c = fbChrome(t, h, colors);
        const b = { x: M - 10, y: h * 0.13, w: W * 0.58, h: h * 0.18 };
        return design('frame-bubble', 'photo', format, colors, {
          background: photoBg(photo),
          shapes: [...c.shapes, shape({ id: 'bubble', kind: 'bubble', ...b, radius: 36, fill: '#FFFFFF', tail: 'bl' })],
          layers: [rich({ id: 'headline', role: 'headline', x: b.x + 36, y: b.y + 28, width: b.w - 72, height: b.h - 56, size: 58, weight: 800, color: '#14141A', valign: 'middle', lineHeight: 1.05 }, t.headline, { color: colors.accent, fallback: 0 }), ...c.layers],
        });
      },
    },
  ],
});

/* ———————————————————————— B. Soft Pastel Money ———————————————————————— */

const SPM_VIOLET: Colors = { main: '#4B3FD9', ink: '#FFFFFF', accent: '#FFFFFF' };
const spmPastel = (main: string): Colors => ({ main, ink: '#2A2D9C', accent: '#2A2D9C' });

const spmPrompt = (idea: string, subject: string, c: Colors, k?: Cast) =>
  `Bright, friendly advertising photo about this idea: "${idea}". ${subject}${castLine(k)} ${flat(c.main)}, soft even studio light, crisp and clean. ${keepOff('green')} ${NO_TEXT}`;

function spmBuild(layoutId: string, place: (h: number) => { headline: Partial<TextLayer> & { x: number; y: number; width: number; height: number }; body?: { x: number; y: number; width: number; height: number }; glow: { x: number; y: number; w: number; h: number } }) {
  return (input: BuildInput) => {
    const { text: t, format, colors } = input;
    const h = heightOf(format);
    const p = place(h);
    const page = pageWithSubject(input, colors.main);
    const ink = page.cut ? colors.ink : inkOn(input.photo, colors.ink);
    const strip = h * 0.085;
    const labels = layoutId === 'labels' ? items(t.body, 3) : [];
    // Labels float at the edges, clear of the face
    const spots = [
      [W * 0.68, h * 0.5],
      [M, h * 0.6],
      [W * 0.64, h * 0.78],
    ];
    return design('soft-pastel-money', layoutId, format, colors, {
      background: page.background,
      images: page.images,
      shapes: [
        ...(page.cut ? [shape({ id: 'glow', kind: 'ellipse', ...p.glow, fill: lighten(colors.main, 0.22), opacity: 0.7 })] : []),
        shape({ id: 'strip', kind: 'rect', x: 0, y: h - strip, w: W, h: strip, fill: '#FFFFFF', front: true }),
      ],
      layers: [
        ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 48, 30, ink, { weight: 800 }),
        rich({ id: 'headline', role: 'headline', size: 76, weight: 600, color: ink, lineHeight: 1.05, letterSpacing: -0.02, ...p.headline }, t.headline, { bold: true, italic: true, color: colors.accent === colors.ink ? undefined : readable(colors.accent, colors.main), fallback: 2 }),
        ...(p.body && !labels.length ? line('body', 'body', t.body, p.body.x, p.body.y, p.body.width, p.body.height, 30, ink, { weight: 400, align: p.headline.align ?? 'left' }) : []),
        ...labels.map((l, i) => text({ id: `item${i}`, role: 'body', text: l, x: spots[i][0], y: spots[i][1], width: W * 0.28, height: 72, size: 30, weight: 700, fill: '#FFFFFF', color: '#14141A', align: spots[i][0] > W / 2 ? 'right' : 'left' })),
        ...line('kicker', 'kicker', t.kicker, M, h - strip + strip * 0.28, W * 0.5, strip * 0.44, 20, '#5B6170', { valign: 'middle' }),
        ...pill('cta', t.cta ?? 'Get the app', W - M - 280, h - strip + (strip - 50) / 2, '#111111', 280, 22, 'right'),
      ],
    });
  };
}

const spmExample = (e: Omit<RecipeText, 'footer' | 'kicker' | 'cta'>): RecipeText => ({ footer: 'Kobo Finance', kicker: 'Licensed and insured', cta: 'Get the app', ...e });

const SOFT_PASTEL_MONEY = family({
  id: 'soft-pastel-money',
  name: 'Soft Pastel Money',
  family: 'series',
  description: 'Soft pastel pages, a smiling person or a 3D object, one word in bold',
  colors: SPM_VIOLET,
  wordsHint: 'Mark the 1-3 words that land the point with asterisks, like "Smart savings with *Zero Drama*". Body: one short sentence.',
  layouts: [
    {
      id: 'split',
      name: 'Words left, person right',
      colors: SPM_VIOLET,
      cutout: 'green',
      example: spmExample({ headline: 'Everybody writes *secure* on their homepage.', body: 'Only one word has somebody standing behind it.' }),
      imagePrompt: (idea, c, k) => spmPrompt(idea, `One smiling person holding ${obj(k, 'a phone')}, upper body, in the right half of the frame; the left half is empty.`, c, k),
      build: spmBuild('split', (h) => ({ headline: { x: M, y: h * 0.2, width: W * 0.48, height: h * 0.26 }, body: { x: M, y: h * 0.48, width: W * 0.42, height: h * 0.12 }, glow: { x: W * 0.4, y: h * 0.2, w: W * 0.7, h: W * 0.7 } })),
    },
    {
      id: 'top',
      name: 'Words on top, person below',
      colors: spmPastel('#EAF8E4'),
      cutout: 'green',
      example: spmExample({ headline: 'Unnamed money wanders. *Named money arrives.*' }),
      imagePrompt: (idea, c, k) => spmPrompt(idea, 'One joyful person, waist up, centred in the lower 60% of the frame; the top 40% is empty.', c, k),
      build: spmBuild('top', (h) => ({ headline: { x: M, y: h * 0.1, width: W - M * 2, height: h * 0.2, align: 'center' }, body: { x: M * 2, y: h * 0.31, width: W - M * 4, height: h * 0.08 }, glow: { x: W * 0.18, y: h * 0.36, w: W * 0.64, h: W * 0.64 } })),
    },
    {
      id: 'object',
      name: '3D object hero',
      colors: SPM_VIOLET,
      cutout: 'green',
      example: spmExample({ headline: 'Idle money is not resting. *It is shrinking.*' }),
      imagePrompt: (idea, c, k) => spmPrompt(idea, `${k?.object ? `A large glossy 3D render of ${k.object}` : 'One large glossy 3D object that symbolises the idea (for example a padlock, a safe or a piggy bank)'}, in the lower right of the frame; the upper left is empty.`, c, k),
      build: spmBuild('object', (h) => ({ headline: { x: M, y: h * 0.13, width: W * 0.62, height: h * 0.26 }, body: { x: M, y: h * 0.41, width: W * 0.46, height: h * 0.1 }, glow: { x: W * 0.36, y: h * 0.34, w: W * 0.7, h: W * 0.7 } })),
    },
    {
      id: 'object-low',
      name: 'Object below the words',
      colors: spmPastel('#E5F0FF'),
      cutout: 'green',
      example: spmExample({ headline: 'A *budget* is telling your money where to go.' }),
      imagePrompt: (idea, c, k) => spmPrompt(idea, `${k?.object ? `A neat, glossy arrangement of ${k.object}` : 'A glossy 3D object or a neat arrangement of objects that symbolise the idea'}, filling the bottom half of the frame; the top half is empty.`, c, k),
      build: spmBuild('object-low', (h) => ({ headline: { x: M, y: h * 0.11, width: W - M * 2, height: h * 0.22, align: 'center' }, body: { x: M * 2, y: h * 0.34, width: W - M * 4, height: h * 0.08 }, glow: { x: W * 0.1, y: h * 0.42, w: W * 0.8, h: W * 0.6 } })),
    },
    {
      id: 'labels',
      name: 'Person with labels',
      colors: spmPastel('#E9E3FF'),
      cutout: 'green',
      example: spmExample({ headline: 'You are also *a bill.*', body: 'Rent · Data · Transport' }),
      imagePrompt: (idea, c, k) => spmPrompt(idea, 'One expressive person, upper body, slightly right of centre in the lower 75% of the frame; the upper left is empty.', c, k),
      build: spmBuild('labels', (h) => ({ headline: { x: M, y: h * 0.2, width: W * 0.46, height: h * 0.2 }, glow: { x: W * 0.25, y: h * 0.3, w: W * 0.66, h: W * 0.66 } })),
    },
  ],
});

/* ———————————————————————— C. Clinic Editorial ———————————————————————— */

const CE_OWN: Colors = { main: '#F1F2F4', ink: '#111111', accent: '#E23B3B' };

const cePrompt = (idea: string, subject: string, c: Colors, k?: Cast) =>
  `Clean, premium editorial image about this idea: "${idea}". ${subject}${castLine(k)} ${flat(c.main)}, soft diffused studio light, gentle shadow, high detail. ${keepOff('green')} ${NO_TEXT}`;

/** The brand at the top, the line at the bottom, and the white button with its round red arrow */
function ceChrome(t: RecipeText, h: number, colors: Colors, ctaY: number, ctaRight = W * 0.7): { layers: TextLayer[]; shapes: ShapeLayer[] } {
  const d = 62;
  return {
    shapes: t.cta === '' ? [] : [shape({ id: 'arrow-dot', kind: 'ellipse', x: ctaRight + 12, y: ctaY + 2, w: d, h: d, fill: colors.accent })],
    layers: [
      ...line('footer', 'footer', t.footer, M, M - 20, W * 0.4, 72, 26, colors.ink, { weight: 800, uppercase: true, lineHeight: 0.95 }),
      ...line('kicker', 'kicker', t.kicker, M, h - M - 30, W - M * 2, 40, 22, '#4B5160'),
      ...(t.cta === ''
        ? []
        : [
            text({ id: 'cta', role: 'pill', text: t.cta ?? 'See how it works', x: M, y: ctaY, width: ctaRight - M, height: 66, size: 26, weight: 600, fill: '#FFFFFF', color: '#111111', align: 'right' }),
            text({ id: 'arrow', role: 'kicker', text: '→', x: ctaRight + 12, y: ctaY + 2, width: d, height: d, size: 36, weight: 700, color: bestTextColor([colors.accent]), align: 'center', valign: 'middle' }),
          ]),
    ],
  };
}

const ceExample = (e: Omit<RecipeText, 'footer' | 'kicker'>): RecipeText => ({ footer: 'Lekki Vein\nClinic', kicker: 'lekkivein.clinic · 0802 123 4567', ...e });

const serifHeadline = (raw: string, x: number, y: number, width: number, height: number, ink: string, size = 120, align: TextLayer['align'] = 'center', more: Partial<TextLayer> = {}) =>
  text({ id: 'headline', role: 'headline', text: plain(raw)!, x, y, width, height, size, font: 'serif', weight: 400, color: ink, align, valign: 'middle', lineHeight: 0.98, letterSpacing: -0.01, ...more });

const CLINIC_EDITORIAL = family({
  id: 'clinic-editorial',
  name: 'Clinic Editorial',
  family: 'editorial',
  description: 'A light grey page, a big serif headline and a glossy 3D object',
  colors: CE_OWN,
  wordsHint: 'Short, calm, expert headline of 2-6 words. Put the 1-2 key words between asterisks, like "Bad *habits* make it worse". Body: one short line. CTA: 3-5 words, like "See the tips".',
  layouts: [
    {
      id: 'object',
      name: 'Headline over an object',
      cutout: 'green',
      example: ceExample({ headline: 'Veins & Your Heart', body: 'How are they connected?', cta: 'See how it works' }),
      imagePrompt: (idea, c, k) => cePrompt(idea, `${k?.object ? `A glossy 3D render of ${k.object}` : 'One glossy, colourful 3D object that symbolises the idea'}, in the middle of the frame; the top third and the bottom fifth are empty.`, c, k),
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const c = ceChrome(t, h, colors, h * 0.78);
        return design('clinic-editorial', 'object', format, colors, {
          ...page,
          shapes: c.shapes,
          layers: [serifHeadline(t.headline, M, h * 0.1, W - M * 2, h * 0.2, colors.ink), ...line('body', 'body', t.body, M, h * 0.31, W - M * 2, 50, 30, colors.ink, { align: 'center', weight: 700 }), ...c.layers],
        });
      },
    },
    {
      id: 'behind',
      name: 'Headline behind the person',
      cutout: 'green',
      example: ceExample({ headline: 'Move Every Day', body: 'Keep your blood flowing well', cta: 'See the tips' }),
      imagePrompt: (idea, c, k) => cePrompt(idea, 'One person in motion (running, stretching or walking briskly), full body, in the right two-thirds of the frame, their head in the upper third.', c, k),
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const c = ceChrome(t, h, colors, h * 0.74, W * 0.78);
        return design('clinic-editorial', 'behind', format, colors, {
          ...page,
          shapes: c.shapes,
          layers: [serifHeadline(t.headline, M, h * 0.1, W * 0.86, h * 0.24, colors.ink, 160, 'left', { behind: page.cut, font: 'serif' }), ...line('body', 'body', t.body, M, h * 0.36, W * 0.36, h * 0.12, 30, colors.ink, { weight: 700 }), ...c.layers],
        });
      },
    },
    {
      id: 'board',
      name: 'Chalkboard word',
      cutout: 'green',
      example: ceExample({ headline: 'Habits that *make it worse*', cta: 'Avoid these' }),
      imagePrompt: (idea, c, k) => cePrompt(idea, `${k?.object ? `A glossy 3D render of ${k.object}` : 'One small 3D object that fits the idea'}, in the lower right corner of the frame; the rest of the frame is empty.`, c, k),
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const parts = aroundAccent(t.headline);
        const c = ceChrome(t, h, colors, h * 0.76);
        const b = { x: W * 0.17, y: h * 0.32, w: W * 0.66, h: h * 0.2 };
        return design('clinic-editorial', 'board', format, colors, {
          ...page,
          shapes: [shape({ id: 'board', kind: 'rect', ...b, radius: 6, fill: '#2E3A33', stroke: '#B07A45', strokeWidth: 16 }), ...c.shapes],
          layers: [
            serifHeadline(parts.before || parts.accent, M, h * 0.15, W - M * 2, h * 0.15, colors.ink),
            text({ id: 'board', role: 'headline', text: parts.before ? parts.accent : '', x: b.x + 40, y: b.y + 30, width: b.w - 80, height: b.h - 60, size: 90, font: 'script', weight: 400, color: '#F4F1E8', align: 'center', valign: 'middle', lineHeight: 1 }),
            text({ id: 'headline2', role: 'headline', text: parts.after, x: M, y: h * 0.54, width: W - M * 2, height: h * 0.15, size: 120, font: 'serif', weight: 400, color: colors.ink, align: 'center', valign: 'middle' }),
            ...c.layers,
          ],
        });
      },
    },
    {
      id: 'stack',
      name: 'Big headline, small object',
      cutout: 'green',
      example: ceExample({ headline: 'Blue lines winding on your legs', body: 'More than looks: it can be the start of something worse.', cta: '' }),
      imagePrompt: (idea, c, k) => cePrompt(idea, `${k?.object ? `A glossy 3D render of ${k.object}` : 'One small 3D object or close-up detail that fits the idea'}, in the lower right quarter of the frame; the rest is empty.`, c, k),
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const c = ceChrome({ ...t, cta: t.cta || '' }, h, colors, h * 0.78);
        return design('clinic-editorial', 'stack', format, colors, {
          ...page,
          shapes: c.shapes,
          layers: [serifHeadline(t.headline, M, h * 0.16, W - M * 2, h * 0.34, colors.ink, 130, 'left'), ...line('body', 'body', t.body, M, h * 0.54, W * 0.46, h * 0.14, 28, colors.ink, { weight: 400 }), ...c.layers],
        });
      },
    },
    {
      id: 'versus',
      name: 'This vs that',
      cutout: 'green',
      example: ceExample({ headline: 'Varicose Veins vs Deep Vein Clots', cta: 'Know the difference' }),
      imagePrompt: (idea, c, k) => cePrompt(idea, `${k?.object ? `A glossy 3D render of ${k.object}` : 'One glossy 3D object that fits the idea'} in the lower right of the frame, reaching toward the middle; the top half is empty.`, c, k),
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const raw = plain(t.headline)!;
        const split = raw.split(/\s+vs\.?\s+|\n/i);
        const [a, b] = split.length > 1 ? [split[0], split.slice(1).join(' ')] : [raw, ''];
        const c = ceChrome(t, h, colors, h * 0.74);
        return design('clinic-editorial', 'versus', format, colors, {
          ...page,
          shapes: c.shapes,
          layers: [
            serifHeadline(a, M, h * 0.14, W - M * 2, h * 0.14, colors.ink),
            ...(b ? [text({ id: 'vs', role: 'kicker', text: 'vs', x: M, y: h * 0.29, width: W - M * 2, height: 60, size: 50, font: 'serif', weight: 400, color: colors.accent, align: 'center' })] : []),
            text({ id: 'headline2', role: 'headline', text: b, x: M, y: h * 0.35, width: W - M * 2, height: h * 0.2, size: 120, font: 'serif', weight: 400, color: colors.ink, align: 'center', valign: 'middle', lineHeight: 0.98 }),
            ...c.layers,
          ],
        });
      },
    },
  ],
});

/* ———————————————————————— E. Ribbon Celebration ———————————————————————— */

const RC = {
  coral: { main: '#F26B5B', ink: '#FFFFFF', accent: '#7A1E2B' },
  navy: { main: '#1E2D8F', ink: '#FFFFFF', accent: '#F05A5A' },
  yellow: { main: '#F6C343', ink: '#2B1D0E', accent: '#D9481F' },
  orange: { main: '#F07A2E', ink: '#FFFFFF', accent: '#7A2A0C' },
  purple: { main: '#5B3FC9', ink: '#FFFFFF', accent: '#F6C343' },
  lavender: { main: '#9F82E8', ink: '#FFFFFF', accent: '#2E1F6E' },
} satisfies Record<string, Colors>;

const rcPrompt = (idea: string, where: string, c: Colors, k?: Cast) =>
  `Joyful, playful studio photo for a celebration about this idea: "${idea}": ${k?.people ? 'two or three people the celebration is about' : 'a parent and a young child'} having fun together with simple props${k?.object ? ` and ${k.object}` : ''}, big genuine smiles. ${where}${castLine(k)} ${flat(c.main)}, bright clean commercial light. ${keepOff('magenta')} ${NO_TEXT}`;

interface RcPlace {
  giant: { x: number; y: number; width: number; height: number; align?: TextLayer['align']; behind?: boolean; size?: number };
  script: { x: number; y: number; width: number; height: number; align?: TextLayer['align'] };
  stamp: { x: number; y: number; d: number };
  body: { x: number; y: number; width: number; height: number };
  ribbon: { x: number; y: number; w: number; h: number };
}

function rcBuild(layoutId: string, place: (h: number) => RcPlace) {
  return (input: BuildInput) => {
    const { text: t, format, colors } = input;
    const h = heightOf(format);
    const p = place(h);
    const page = pageWithSubject(input, colors.main);
    const ink = page.cut ? colors.ink : inkOn(input.photo, colors.ink);
    const stampText = t.cta ?? 'Happy day';
    return design('ribbon-celebration', layoutId, format, colors, {
      background: page.background,
      images: page.images,
      shapes: [
        ...(page.cut ? [shape({ id: 'ribbon', kind: 'ribbon', ...p.ribbon, stroke: colors.accent, strokeWidth: 22, opacity: 0.95 })] : []),
        shape({ id: 'stamp', kind: 'ellipse', x: p.stamp.x, y: p.stamp.y, w: p.stamp.d, h: p.stamp.d, stroke: ink, strokeWidth: 3, front: true }),
      ],
      layers: [
        text({ id: 'headline', role: 'headline', text: plain(t.headline)!, ...p.giant, size: p.giant.size ?? 230, font: 'archivo', weight: 400, color: ink, align: p.giant.align ?? 'center', valign: 'middle', lineHeight: 0.88, uppercase: true, letterSpacing: -0.01, behind: (p.giant.behind ?? false) && page.cut }),
        ...line('kicker', 'kicker', t.kicker, p.script.x, p.script.y, p.script.width, p.script.height, 120, colors.accent, { font: 'script', weight: 400, align: p.script.align ?? 'center', valign: 'middle', lineHeight: 1 }),
        text({ id: 'cta', role: 'kicker', text: stampText, x: p.stamp.x + 18, y: p.stamp.y + 18, width: p.stamp.d - 36, height: p.stamp.d - 36, size: 26, weight: 800, color: ink, align: 'center', valign: 'middle', uppercase: true, lineHeight: 1.05 }),
        ...line('body', 'body', t.body, p.body.x, p.body.y, p.body.width, p.body.height, 26, ink, { weight: 600 }),
        ...line('footer', 'footer', t.footer, M, h - M - 30, W - M * 2, 40, 24, ink, { weight: 700, align: 'center' }),
      ],
    });
  };
}

const rcExample = (e: Omit<RecipeText, 'footer'>): RecipeText => ({ footer: 'Bloom Gifts · @bloomgifts', cta: 'Happy day', ...e });

const RIBBON_CELEBRATION = family({
  id: 'ribbon-celebration',
  name: 'Ribbon Celebration',
  family: 'celebration',
  description: 'One bold colour, a flowing ribbon, a giant word with a script word across it',
  colors: RC.navy,
  wordsHint: 'Headline: one or two short words for the giant word (e.g. "PAPA" or "Thank you"). Kicker: one or two warm words for a script line (e.g. "love you"). Body: one short warm sentence.',
  layouts: [
    {
      id: 'word-low',
      name: 'Photo up, word below',
      colors: RC.coral,
      cutout: 'magenta',
      example: rcExample({ headline: 'Papa', kicker: 'love you', body: 'For turning every moment into a reason to smile.' }),
      imagePrompt: (idea, c, k) => rcPrompt(idea, 'They sit together on a chair in the upper 60% of the frame; the bottom 35% is empty floor.', c, k),
      build: rcBuild('word-low', (h) => ({ giant: { x: M, y: h * 0.64, width: W - M * 2, height: h * 0.17 }, script: { x: M * 2, y: h * 0.74, width: W - M * 4, height: h * 0.1 }, stamp: { x: W - M - 170, y: M, d: 170 }, body: { x: M, y: M, width: W * 0.34, height: h * 0.12 }, ribbon: { x: -40, y: h * 0.3, w: W + 80, h: h * 0.3 } })),
    },
    {
      id: 'big-photo',
      name: 'Big photo, word in the middle',
      colors: RC.navy,
      cutout: 'magenta',
      example: rcExample({ headline: 'Papa', kicker: 'thank you', body: 'My partner in missions, games and life.' }),
      imagePrompt: (idea, c, k) => rcPrompt(idea, 'They lie or play on a big cushion, filling the upper 60% of the frame; the lower part is empty.', c, k),
      build: rcBuild('big-photo', (h) => ({ giant: { x: M, y: h * 0.62, width: W - M * 2, height: h * 0.18 }, script: { x: M * 2, y: h * 0.73, width: W - M * 4, height: h * 0.1 }, stamp: { x: W - M - 180, y: M + 30, d: 180 }, body: { x: M, y: M, width: W * 0.4, height: h * 0.1 }, ribbon: { x: -60, y: h * 0.05, w: W + 120, h: h * 0.85 } })),
    },
    {
      id: 'word-top',
      name: 'Word on top, photo below',
      colors: RC.yellow,
      cutout: 'magenta',
      example: rcExample({ headline: 'Papa', kicker: 'team', body: 'Teaching is an act of love you master every day.' }),
      imagePrompt: (idea, c, k) => rcPrompt(idea, 'They sit on the floor together in the lower 55% of the frame; the top 40% is empty.', c, k),
      build: rcBuild('word-top', (h) => ({ giant: { x: M, y: M + 10, width: W * 0.56, height: h * 0.24, align: 'left' }, script: { x: M, y: h * 0.17, width: W * 0.56, height: h * 0.1, align: 'left' }, stamp: { x: W - M - 160, y: h * 0.06, d: 160 }, body: { x: W * 0.62, y: h * 0.2, width: W * 0.38 - M, height: h * 0.14 }, ribbon: { x: -40, y: h * 0.26, w: W + 80, h: h * 0.2 } })),
    },
    {
      id: 'stamp',
      name: 'Stamp and word',
      colors: RC.orange,
      cutout: 'magenta',
      example: rcExample({ headline: 'Papa', kicker: 'love you', body: 'Our partnership is life’s greatest show.' }),
      imagePrompt: (idea, c, k) => rcPrompt(idea, 'They hug and laugh in the centre of the frame; the bottom quarter is empty.', c, k),
      build: rcBuild('stamp', (h) => ({ giant: { x: M, y: h * 0.7, width: W * 0.7, height: h * 0.15, align: 'left' }, script: { x: M, y: h * 0.8, width: W * 0.7, height: h * 0.09, align: 'left' }, stamp: { x: M, y: M + 10, d: 190 }, body: { x: W * 0.66, y: h * 0.38, width: W * 0.34 - M, height: h * 0.14 }, ribbon: { x: W * 0.3, y: h * 0.02, w: W * 0.8, h: h * 0.3 } })),
    },
    {
      id: 'across',
      name: 'Word behind the people',
      colors: RC.purple,
      cutout: 'magenta',
      example: rcExample({ headline: 'Papa', kicker: 'thank you', body: 'Your love is as big as the universe.' }),
      imagePrompt: (idea, c, k) => rcPrompt(idea, 'They kneel side by side in the lower 70% of the frame, their heads near the middle; the top 30% is empty.', c, k),
      build: rcBuild('across', (h) => ({ giant: { x: 20, y: h * 0.62, width: W - 40, height: h * 0.2, behind: true, size: 300 }, script: { x: M * 2, y: h * 0.76, width: W - M * 4, height: h * 0.1 }, stamp: { x: W - M - 160, y: M, d: 160 }, body: { x: M, y: M, width: W * 0.36, height: h * 0.14 }, ribbon: { x: W * 0.2, y: -20, w: W, h: h * 0.4 } })),
    },
    {
      id: 'side',
      name: 'Word left, people right',
      colors: RC.lavender,
      cutout: 'magenta',
      example: rcExample({ headline: 'Papa', kicker: 'love you', body: 'If there’s laughter, Papa is close by.' }),
      imagePrompt: (idea, c, k) => rcPrompt(idea, 'They are in the right half of the frame, full body, sitting on a chair; the left half is empty.', c, k),
      build: rcBuild('side', (h) => ({ giant: { x: M, y: h * 0.12, width: W * 0.5, height: h * 0.2, align: 'left', size: 180 }, script: { x: M, y: h * 0.27, width: W * 0.5, height: h * 0.1, align: 'left' }, stamp: { x: M, y: h * 0.64, d: 160 }, body: { x: M, y: h * 0.42, width: W * 0.38, height: h * 0.16 }, ribbon: { x: -40, y: h * 0.45, w: W * 0.7, h: h * 0.5 } })),
    },
  ],
});

/* ———————————————————————— M. Safe Hold ———————————————————————— */

const SH_VIOLET: Colors = { main: '#6A2EE8', ink: '#FFFFFF', accent: '#3BE58A' };
const SH_BLUE: Colors = { main: '#2F7BFF', ink: '#FFFFFF', accent: '#C8F53A' };

const shPrompt = (idea: string, subject: string, c: Colors, k?: Cast) =>
  `Bright, confident advertising photo about this idea: "${idea}". ${subject}${castLine(k)} The people wear colourful, stylish clothes (nothing bright green). ${flat(c.main)}, crisp studio light. ${NO_TEXT}`;

function shBuild(layoutId: string, place: (h: number) => { headline: { x: number; y: number; width: number; height: number; align?: TextLayer['align'] }; body: { x: number; y: number; width: number; height: number }; behind?: ShapeLayer }) {
  return (input: BuildInput) => {
    const { text: t, format, colors } = input;
    const h = heightOf(format);
    const p = place(h);
    const page = pageWithSubject(input, colors.main);
    const ink = page.cut ? colors.ink : inkOn(input.photo, colors.ink);
    const strip = h * 0.12;
    return design('safe-hold', layoutId, format, colors, {
      background: page.background,
      images: page.images,
      shapes: [
        ...(page.cut ? [shape({ id: 'glow', kind: 'ellipse', x: -W * 0.2, y: h * 0.3, w: W * 1.4, h: h * 0.9, fill: lighten(colors.main, 0.08), opacity: 0.8 })] : []),
        ...(page.cut && p.behind ? [{ ...p.behind, fill: colors.accent }] : []),
        shape({ id: 'strip', kind: 'rect', x: 0, y: h - strip, w: W, h: strip, fill: '#FFFFFF', front: true }),
        shape({ id: 'strip-dot', kind: 'rect', x: M, y: h - strip / 2 - 16, w: 32, h: 32, radius: 8, fill: colors.main, front: true }),
      ],
      layers: [
        ...line('footer', 'footer', t.footer, M, M - 16, W * 0.5, 50, 32, ink, { weight: 800 }),
        rich({ id: 'headline', role: 'headline', ...p.headline, size: 72, weight: 800, color: ink, valign: 'top', lineHeight: 1.04, letterSpacing: -0.02 }, t.headline, { color: readable(colors.accent, colors.main), fallback: 2 }),
        ...line('body', 'body', t.body, p.body.x, p.body.y, p.body.width, p.body.height, 28, ink, { weight: 600, align: p.headline.align ?? 'left' }),
        ...line('kicker', 'kicker', t.kicker, M + 48, h - strip / 2 - 22, W * 0.46, 44, 22, '#3A3F4B', { valign: 'middle' }),
        ...pill('cta', t.cta ?? 'Sign up', W - M - 300, h - strip / 2 - 30, colors.main, 300, 24, 'right'),
      ],
    });
  };
}

const shExample = (e: Omit<RecipeText, 'footer' | 'kicker' | 'cta'>): RecipeText => ({ footer: 'Keepsafe Pay', kicker: 'support@keepsafe.pay', cta: 'Sign up', ...e });

const SAFE_HOLD = family({
  id: 'safe-hold',
  name: 'Safe Hold',
  family: 'series',
  description: 'Violet or bright blue, a smiling person with a phone, a neon shape behind them',
  colors: SH_VIOLET,
  wordsHint: 'Mark 2-3 key words of the headline with asterisks, like "No more *I’ve sent it* anxiety". Body: one short reassuring sentence.',
  layouts: [
    {
      id: 'centre',
      name: 'Person in the middle',
      colors: SH_VIOLET,
      cutout: 'green',
      example: shExample({ headline: 'No more *“I’ve sent it”* anxiety.', body: 'Funds are held safely until the deal is confirmed.' }),
      imagePrompt: (idea, c, k) => shPrompt(idea, `One smiling person seated, holding ${obj(k, 'a phone')} and making an OK sign, centred in the lower 55% of the frame; the top 40% is empty.`, c, k),
      build: shBuild('centre', (h) => ({ headline: { x: M, y: h * 0.1, width: W - M * 2, height: h * 0.16, align: 'center' }, body: { x: M * 2, y: h * 0.27, width: W - M * 4, height: h * 0.06 }, behind: shape({ id: 'steps', kind: 'steps', x: W * 0.1, y: h * 0.4, w: W * 0.8, h: h * 0.32 }) })),
    },
    {
      id: 'right',
      name: 'Person left, words right',
      colors: SH_BLUE,
      cutout: 'green',
      example: shExample({ headline: 'Because trust shouldn’t feel *like a gamble.*', body: 'We hold payments safely until both sides are happy.' }),
      imagePrompt: (idea, c, k) => shPrompt(idea, `One smiling person in a hoodie looking at ${obj(k, 'a phone')}, upper body, in the left half of the frame; the right half is empty.`, c, k),
      build: shBuild('right', (h) => ({ headline: { x: W * 0.5, y: h * 0.12, width: W * 0.5 - M, height: h * 0.2 }, body: { x: W * 0.5, y: h * 0.34, width: W * 0.5 - M, height: h * 0.08 }, behind: shape({ id: 'zigzag', kind: 'zigzag', x: W * 0.42, y: h * 0.46, w: W * 0.62, h: h * 0.2 }) })),
    },
    {
      id: 'left',
      name: 'Words left, person close-up',
      colors: SH_VIOLET,
      cutout: 'green',
      example: shExample({ headline: 'If it’s not confirmed, *it’s not released.*', body: 'That’s how your money stays protected.' }),
      imagePrompt: (idea, c, k) => shPrompt(idea, `One person in profile looking down at ${obj(k, 'a phone')}, upper body close-up, in the right half of the frame; the left half is empty.`, c, k),
      build: shBuild('left', (h) => ({ headline: { x: M, y: h * 0.14, width: W * 0.5, height: h * 0.22 }, body: { x: M, y: h * 0.38, width: W * 0.42, height: h * 0.08 } })),
    },
    {
      id: 'together',
      name: 'Two people together',
      colors: SH_BLUE,
      cutout: 'green',
      example: shExample({ headline: 'Payment made. *Funds held.* Everyone protected.', body: 'Fair shopping, without bias.' }),
      imagePrompt: (idea, c, k) => shPrompt(idea, `Two friends laughing together over ${obj(k, 'one phone')}, upper body, in the lower half of the frame; the top 45% is empty.`, c, k),
      build: shBuild('together', (h) => ({ headline: { x: M, y: h * 0.12, width: W - M * 2, height: h * 0.16, align: 'center' }, body: { x: M * 2, y: h * 0.29, width: W - M * 4, height: h * 0.06 }, behind: shape({ id: 'zigzag', kind: 'zigzag', x: W * 0.35, y: h * 0.4, w: W * 0.5, h: h * 0.2 }) })),
    },
  ],
});

/* ———————————————————————— N. Blob Pop ———————————————————————— */

const BP_OWN: Colors = { main: '#FFFDF7', ink: '#FFFFFF', accent: '#FF6A1A' };
const BP_LIME = '#D4F08C';
const bpBlob = (colors: Colors) => (sameColors(colors, BP_OWN) ? BP_LIME : lighten(colors.accent, 0.72));

const bpExample = (e: Omit<RecipeText, 'footer'>): RecipeText => ({ footer: '@thrive247', ...e });

const BLOB_POP = family({
  id: 'blob-pop',
  name: 'Blob Pop',
  family: 'series',
  description: 'Soft lime blobs, a bold orange box with a white headline',
  colors: BP_OWN,
  wordsHint: 'Headline: 2-4 warm words, like "Happy New Week". Kicker: one word such as the month. Body: one or two short upbeat sentences.',
  layouts: [
    {
      id: 'scallop',
      name: 'Illustration and wavy box',
      cutout: 'magenta',
      example: bpExample({ headline: 'Happy New Week', body: 'New week, new ideas. We’re already three steps ahead.' }),
      imagePrompt: (idea, _c, k) =>
        `A flat 2D vector illustration about this idea: "${idea}": two people (one sitting on a bench, one walking), each with ${obj(k, 'a phone')}, simple shapes, green and blue clothes, in the lower left of the frame on a plain white background. The upper right is empty.${castLine(k)} ${keepOff('magenta')} ${NO_TEXT}`,
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const b = { x: W * 0.4, y: h * 0.16, w: W * 0.5, h: h * 0.38 };
        return design('blob-pop', 'scallop', format, colors, {
          background: page.background,
          images: page.images,
          shapes: [
            shape({ id: 'blob1', kind: 'blob', x: -W * 0.25, y: h * 0.45, w: W * 0.8, h: h * 0.7, fill: bpBlob(colors) }),
            shape({ id: 'blob2', kind: 'blob', x: W * 0.62, y: -h * 0.12, w: W * 0.6, h: h * 0.35, fill: bpBlob(colors) }),
            shape({ id: 'box', kind: 'scallop', ...b, fill: colors.accent, front: true }),
            shape({ id: 'dot', kind: 'ellipse', x: b.x + b.w - 70, y: b.y + b.h - 70, w: 110, h: 110, fill: bpBlob(colors), front: true }),
          ],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, '#1B1B1B', { weight: 700 }),
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: b.x + 40, y: b.y + 40, width: b.w - 80, height: b.h * 0.42, size: 84, weight: 800, color: readable(colors.ink, colors.accent), align: 'center', valign: 'middle', lineHeight: 1 }),
            ...line('body', 'body', t.body, b.x + 50, b.y + b.h * 0.5, b.w - 100, b.h * 0.38, 24, readable(colors.ink, colors.accent), { align: 'center' }),
          ],
        });
      },
    },
    {
      id: 'tall-box',
      name: 'Person and tall box',
      cutout: 'magenta',
      example: bpExample({ headline: 'Happy New Month', kicker: 'November', body: 'May your calendar stay full and every post turn into a loyal community.' }),
      imagePrompt: (idea, _c, k) =>
        `Friendly portrait photo about this idea: "${idea}": one confident person in an orange top${k?.object ? `, with ${k.object}` : ''}, upper body, turned slightly, in the left half of the frame, on a plain light cream background. The right half is empty.${castLine(k)} ${keepOff('magenta')} ${NO_TEXT}`,
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        const b = { x: W * 0.5, y: h * 0.1, w: W * 0.5 - M + 20, h: h * 0.62 };
        const ink = readable(colors.ink, colors.accent);
        return design('blob-pop', 'tall-box', format, colors, {
          background: page.background,
          images: page.images,
          shapes: [
            shape({ id: 'blob1', kind: 'blob', x: -W * 0.1, y: h * 0.55, w: W * 0.9, h: h * 0.6, fill: bpBlob(colors) }),
            shape({ id: 'box', kind: 'rect', ...b, radius: 70, fill: colors.accent, front: true }),
            shape({ id: 'rule', kind: 'rect', x: b.x + 44, y: b.y + b.h * 0.47, w: b.w - 88, h: 2, fill: ink, opacity: 0.6, front: true }),
          ],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, '#1B1B1B', { weight: 700 }),
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: b.x + 44, y: b.y + 44, width: b.w - 88, height: b.h * 0.38, size: 110, weight: 800, color: ink, lineHeight: 0.95, valign: 'middle' }),
            ...line('kicker', 'kicker', t.kicker, b.x + 44, b.y + b.h * 0.49, b.w - 88, 40, 20, ink, { uppercase: true, letterSpacing: 0.12, align: 'center', weight: 700 }),
            ...line('body', 'body', t.body, b.x + 44, b.y + b.h * 0.58, b.w - 88, b.h * 0.36, 24, ink, { lineHeight: 1.3 }),
          ],
        });
      },
    },
    {
      id: 'photo-word',
      name: 'Photo with a big word',
      example: bpExample({ headline: 'Happy New Month', kicker: 'December', body: 'Use December as the runway for next year’s growth.' }),
      imagePrompt: (idea, _c, k) =>
        `Warm lifestyle photo about this idea: "${idea}": one smiling person in an orange top and a grey jacket using ${obj(k, 'a tablet')}, upper body, in the right half of the frame, in a softly lit room that fits the idea. The lower left is calm, darker background.${castLine(k)} ${NO_TEXT}`,
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        return design('blob-pop', 'photo-word', format, colors, {
          background: photoBg(photo),
          shapes: [
            shape({ id: 'blob1', kind: 'blob', x: -W * 0.3, y: h * 0.58, w: W * 0.9, h: h * 0.6, fill: bpBlob(colors), opacity: 0.85 }),
            shape({ id: 'fade', kind: 'fade', x: 0, y: h * 0.5, w: W, h: h * 0.5, fill: '#000000', opacity: 0.55 }),
          ],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, '#FFFFFF', { weight: 700 }),
            ...pill('kicker', t.kicker, W - M - 280, M - 30, bpBlob(colors), 280, 24, 'right'),
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: h * 0.56, width: W * 0.62, height: h * 0.24, size: 120, weight: 800, color: '#FFFFFF', lineHeight: 0.92, valign: 'bottom' }),
            ...line('body', 'body', t.body, M, h * 0.81, W * 0.6, h * 0.1, 24, '#FFFFFF', { lineHeight: 1.3 }),
          ],
        });
      },
    },
    {
      id: 'tinted',
      name: 'Tinted photo',
      example: bpExample({ headline: 'Identity is what people remember.', body: 'You control the message. Build accordingly.' }),
      imagePrompt: (idea, _c, k) =>
        `Warm lifestyle photo about this idea: "${idea}": one smiling person with ${obj(k, 'a laptop')}, upper body, in the lower right of the frame, in a softly lit room with plants. The upper left is calm background.${castLine(k)} ${NO_TEXT}`,
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        return design('blob-pop', 'tinted', format, colors, {
          background: photoBg(photo),
          shapes: [
            shape({ id: 'tint', kind: 'fade', x: 0, y: 0, w: W, h: h * 0.62, fill: colors.accent, opacity: 0.88, flip: true }),
            shape({ id: 'fade', kind: 'fade', x: 0, y: h * 0.72, w: W, h: h * 0.28, fill: '#000000', opacity: 0.5 }),
          ],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, '#FFFFFF', { weight: 700 }),
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: h * 0.1, width: W * 0.7, height: h * 0.26, size: 84, weight: 700, color: '#FFFFFF', lineHeight: 1.02 }),
            ...line('body', 'body', t.body, M, h * 0.8, W * 0.6, h * 0.1, 26, '#FFFFFF', { lineHeight: 1.3 }),
          ],
        });
      },
    },
  ],
});

/* ———————————————————————— Single-layout styles ———————————————————————— */

const CONCEPT_OBJECT = family({
  id: 'concept-object',
  name: 'Concept Object',
  family: 'editorial',
  description: 'One grey 3D object on light grey, a thin headline with one word in colour',
  colors: { main: '#ECECEC', ink: '#1A1A1A', accent: '#1597B0' },
  wordsHint: 'A question or statement of 5-9 words. Put the 1-2 key words between asterisks, like "How many *platforms* should one studio run?". Body: one short sentence.',
  layouts: [
    {
      id: 'main',
      name: 'Concept object',
      cutout: 'green',
      example: { headline: 'How many *platforms* should one studio run?', body: 'More tools aren’t always better. Here’s how to find the balance.', footer: 'Arcade Works' },
      imagePrompt: (idea, c, k) =>
        `Minimal conceptual 3D render that symbolises this idea: "${idea}" (${k?.object ? `built around ${k.object}` : 'for example a dartboard with three darts in the bullseye'}), in matte grey monochrome with only a few small details in ${c.accent}, entirely in the lower 55% of the frame, slightly from above; nothing reaches into the top 45%. ${flat(c.main)}, soft studio light and soft shadow. ${keepOff('green')} ${NO_TEXT}`,
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        return design('concept-object', 'main', format, colors, {
          ...page,
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 10, W - M * 2, 44, 28, colors.ink, { weight: 800, uppercase: true, letterSpacing: 0.04, align: 'center' }),
            rich({ id: 'headline', role: 'headline', x: M, y: h * 0.09, width: W - M * 2, height: h * 0.2, size: 92, weight: 400, color: colors.ink, align: 'center', valign: 'middle', lineHeight: 1.06, letterSpacing: -0.02 }, t.headline, { color: colors.accent, bold: true, fallback: 1 }),
            ...line('body', 'body', t.body, M * 2, h * 0.3, W - M * 4, h * 0.07, 28, colors.ink, { align: 'center', weight: 600 }),
            ...line('kicker', 'kicker', t.kicker, M, h - M - 20, W - M * 2, 36, 20, '#8A8F98', { align: 'center' }),
          ],
        });
      },
    },
  ],
});

const STRIKE_RED = '#E0352B';

const STRIKE_THROUGH = family({
  id: 'strike-through',
  name: 'Strike Through',
  family: 'editorial',
  description: 'A cream page, one word crossed out and a better word in colour',
  colors: { main: '#F1ECE6', ink: '#111111', accent: '#1F5BD8' },
  wordsHint: 'Headline: a short phrase where one word is crossed out and replaced by a better one, marked like this: "A queen and her ~~pawns~~ *children*". Body: a short line such as the occasion.',
  layouts: [
    {
      id: 'main',
      name: 'Strike through',
      cutout: 'green',
      example: { headline: 'A queen and her ~~pawns~~ *children.*', body: 'Happy Mother’s Day', kicker: 'Express your heart with us', footer: 'Heartnest' },
      imagePrompt: (idea, c, k) =>
        `Elegant conceptual still life that symbolises this idea: "${idea}": a few small, shiny symbolic objects (${k?.object ? `based on ${k.object}` : 'for example gold and blue chess pieces'}) standing on dark, rough volcanic rocks that fill only the bottom 40% of the frame; the top 55% is empty. ${flat(c.main)} above the rocks, soft light. ${keepOff('green')} ${NO_TEXT}`,
      build(input) {
        const { text: t, format, colors } = input;
        const h = heightOf(format);
        const page = pageWithSubject(input, colors.main);
        return design('strike-through', 'main', format, colors, {
          ...page,
          shapes: [shape({ id: 'rule', kind: 'rect', x: W * 0.5, y: h - M - 12, w: W * 0.28, h: 2, fill: '#FFFFFF', opacity: 0.7, front: true })],
          layers: [
            ...line('footer', 'footer', t.footer, W * 0.14, h * 0.07, W * 0.6, 50, 34, colors.ink, { weight: 700 }),
            rich({ id: 'headline', role: 'headline', x: W * 0.14, y: h * 0.16, width: W * 0.76, height: h * 0.25, size: 116, weight: 400, color: colors.ink, lineHeight: 1.02, letterSpacing: -0.02 }, t.headline, { color: colors.accent, bold: true, strike: STRIKE_RED, fallback: 1 }),
            ...line('body', 'body', t.body, W * 0.14, h * 0.42, W * 0.7, 50, 34, colors.ink, { weight: 400 }),
            ...line('kicker', 'kicker', t.kicker, M, h - M - 32, W * 0.4, 40, 24, '#FFFFFF', { italic: true, weight: 400 }),
          ],
        });
      },
    },
  ],
});

const TORN_PAPER = family({
  id: 'torn-paper',
  name: 'Torn Paper',
  family: 'big-idea',
  description: 'Torn orange paper revealing engraved eyes, headlines on paper scraps',
  colors: { main: '#F0611E', ink: '#111111', accent: '#F0611E' },
  wordsHint: 'Headline: a provocative question of 3-6 words; put the key word between asterisks, like "Why people *ignore* your brand?". Kicker: a short note (5-7 words). Body: a short teaser line.',
  layouts: [
    {
      id: 'main',
      name: 'Torn paper',
      example: { headline: 'Why people *ignore* your brand?', kicker: 'The truth your brand needs to see.', body: '6 reasons you’re being overlooked online', footer: 'Owlmark' },
      imagePrompt: (idea, c, k) =>
        `Mixed-media collage poster about this idea: "${idea}": a sheet of textured ${c.main} orange paper fills the frame; across the upper middle it is torn open in a ragged horizontal strip that reveals a detailed black-and-white engraved etching of a pair of intense human eyes. The bottom half is plain textured orange paper.${castLine(k)} ${NO_TEXT}`,
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const note = { x: W * 0.6, y: M - 30, w: W * 0.4 - M + 20, h: h * 0.12 };
        const paper = { x: M - 24, y: h * 0.56, w: W - M * 2 + 48, h: h * 0.28 };
        return design('torn-paper', 'main', format, colors, {
          background: photoBg(photo),
          shapes: [
            ...(t.kicker ? [shape({ id: 'note', kind: 'rect', ...note, radius: 4, fill: '#E9DFCB' })] : []),
            shape({ id: 'paper', kind: 'rect', ...paper, radius: 6, fill: '#EFE7D8' }),
            ...(t.body ? [shape({ id: 'tape', kind: 'rect', x: M, y: h * 0.86, w: W - M * 2, h: h * 0.065, radius: 4, fill: '#F4C430' })] : []),
          ],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W * 0.45, 50, 32, inkOn(photo), { weight: 800 }),
            ...line('kicker', 'kicker', t.kicker, note.x + 24, note.y + 18, note.w - 48, note.h - 36, 26, '#2A2622', { valign: 'middle', lineHeight: 1.2 }),
            rich({ id: 'headline', role: 'headline', x: paper.x + 40, y: paper.y + 30, width: paper.w - 80, height: paper.h - 60, size: 130, font: 'archivo', weight: 400, color: colors.ink, valign: 'middle', lineHeight: 0.95, letterSpacing: -0.02 }, t.headline, { color: readable(colors.accent, '#EFE7D8', 2.2), fallback: 0 }),
            ...line('body', 'body', t.body, M + 20, h * 0.86, W - M * 2 - 40, h * 0.065, 30, '#1A1A1A', { valign: 'middle', align: 'center' }),
          ],
        });
      },
    },
  ],
});

const MINIATURE_WORLD = family({
  id: 'miniature-world',
  name: 'Miniature World',
  family: 'big-idea',
  description: 'A tiny world on a giant everyday object, a light headline with one word in colour',
  colors: { main: '#1E6FE0', ink: '#FFFFFF', accent: '#3BE36F' },
  wordsHint: 'Headline: a short punchy line of 4-7 words; put the last 1-2 words between asterisks, like "Winter is coming, *rally on.*". Kicker: three short words like "Play · Improve · Achieve". Body: a short line.',
  layouts: [
    {
      id: 'main',
      name: 'Miniature world',
      example: { headline: 'Winter is coming, *rally on.*', kicker: 'Play · Improve · Achieve', body: 'Keep playing. Keep moving.', footer: 'Mini Sports Club' },
      imagePrompt: (idea, c, k) =>
        `Tilt-shift miniature photo about this idea: "${idea}": tiny people acting out the idea on top of ${k?.object ? `a giant ${k.object.replace(/^an? /, '')}` : 'a giant everyday object that fits it'} (for example two tiny badminton players on a court laid on a racket's strings, with a giant shuttlecock), at an angle in the lower 60% of the frame, on a bright saturated ${c.main} background. The upper 40% is plain colour.${castLine(k)} ${NO_TEXT}`,
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        const ink = inkOn(photo, colors.ink);
        return design('miniature-world', 'main', format, colors, {
          background: photoBg(photo),
          shapes: t.body ? [shape({ id: 'underline', kind: 'rect', x: W * 0.14, y: h * 0.355, w: W * 0.24, h: 3, fill: colors.accent })] : [],
          layers: [
            ...line('kicker', 'kicker', t.kicker, M, M - 10, W * 0.6, 36, 22, ink, { uppercase: true, letterSpacing: 0.12 }),
            rich({ id: 'headline', role: 'headline', x: W * 0.14, y: h * 0.17, width: W * 0.6, height: h * 0.13, size: 66, weight: 600, color: ink, lineHeight: 1.08 }, t.headline, { color: colors.accent, bold: true, fallback: 2 }),
            ...line('body', 'body', t.body, W * 0.14, h * 0.31, W * 0.56, 44, 28, ink, { italic: true, weight: 400 }),
            ...line('footer', 'footer', t.footer, M, h - M - 20, W * 0.5, 36, 20, ink, { weight: 700 }),
          ],
        });
      },
    },
  ],
});

const FIRE_MONEY = family({
  id: 'fire-money',
  name: 'Fire & Money',
  family: 'big-idea',
  description: 'Deep red, something valuable on fire, a heavy warning headline',
  colors: { main: '#D7141A', ink: '#FFFFFF', accent: '#8E0B0F' },
  wordsHint: 'Headline: a 4-6 word warning, like "Be burning your budget". Kicker: 3-4 words leading into it, like "Your agency might". Body: one short line. CTA: a short closing line, like "Stop wasting money."',
  layouts: [
    {
      id: 'main',
      name: 'Fire and money',
      example: { headline: 'Be burning your budget', kicker: 'Your studio might', body: 'Spending more. Growing less.', cta: 'Stop wasting money.', footer: 'Northbeam' },
      imagePrompt: (idea, c, k) =>
        `Dramatic advertising photo about this idea: "${idea}": ${k?.object ? `${k.object}, or money tied to it,` : 'a valuable object that fits it (for example a banknote with no readable text, a wallet or a bank card)'} burning with bright flames and sparks, centred in the lower 60% of the frame, on a deep ${c.main} red background with a few blurred flying paper pieces. The top 35% is clear red. ${NO_TEXT}`,
      build({ text: t, format, photo, colors }) {
        const h = heightOf(format);
        return design('fire-money', 'main', format, colors, {
          background: photoBg(photo),
          shapes: t.cta
            ? [
                shape({ id: 'rule-l', kind: 'rect', x: M, y: h - M - 12, w: W * 0.22, h: 2, fill: colors.ink, opacity: 0.7 }),
                shape({ id: 'rule-r', kind: 'rect', x: W - M - W * 0.22, y: h - M - 12, w: W * 0.22, h: 2, fill: colors.ink, opacity: 0.7 }),
              ]
            : [],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W - M * 2, 40, 24, colors.ink, { weight: 800, align: 'center' }),
            ...pill('kicker', t.kicker, M, h * 0.07, colors.accent, W - M * 2, 34, 'center'),
            text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: h * 0.14, width: W - M * 2, height: h * 0.2, size: 120, font: 'archivo', weight: 400, color: colors.ink, align: 'center', valign: 'middle', lineHeight: 0.98 }),
            ...pill('body', t.body, M, h * 0.35, colors.accent, W - M * 2, 28, 'center'),
            ...line('cta', 'kicker', t.cta, W * 0.3, h - M - 32, W * 0.4, 40, 26, colors.ink, { weight: 700, align: 'center' }),
          ],
        });
      },
    },
  ],
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const BIG_DATE = family({
  id: 'big-date',
  name: 'Big Date',
  family: 'celebration',
  description: 'A cream page, a big desk calendar and a script greeting',
  colors: { main: '#FBF4EA', ink: '#173A8C', accent: '#2F6FD6' },
  wordsHint: 'Headline: a greeting ending in one strong word, like "Happy New Month". Kicker: the month in capitals. Body: three one-word services separated by " · ", like "Design · Print · Brand".',
  layouts: [
    {
      id: 'main',
      name: 'Big date',
      noImage: true,
      example: { headline: 'Happy New Month', kicker: 'OCTOBER', cta: '01', body: 'Design · Print · Brand', footer: 'Bright Hub' },
      imagePrompt: () => '',
      build({ text: t, format, colors }) {
        const h = heightOf(format);
        const words = plain(t.headline)!.split(/\s+/).filter(Boolean);
        const big = words.length > 1 ? words[words.length - 1] : words[0] ?? '';
        const script = words.length > 1 ? words.slice(0, -1).join(' ') : '';
        const month = (t.kicker || MONTHS[new Date().getMonth()]).toUpperCase();
        const day = t.cta || '01';
        const page = { x: W * 0.2, y: h * 0.42, w: W * 0.56, h: h * 0.31 };
        const list = items(t.body, 3);
        const colW = (W - M * 2) / Math.max(1, list.length);
        return design('big-date', 'main', format, colors, {
          background: { kind: 'solid', color: colors.main },
          shapes: [
            shape({ id: 'blob1', kind: 'blob', x: W * 0.62, y: -h * 0.08, w: W * 0.6, h: h * 0.32, fill: lighten(colors.accent, 0.82), opacity: 0.8 }),
            shape({ id: 'blob2', kind: 'blob', x: -W * 0.3, y: h * 0.7, w: W * 0.6, h: h * 0.4, fill: lighten(colors.accent, 0.85), opacity: 0.8 }),
            shape({ id: 'squiggle', kind: 'ribbon', x: W * 0.3, y: h * 0.335, w: W * 0.4, h: h * 0.03, stroke: colors.accent, strokeWidth: 8 }),
            shape({ id: 'stand', kind: 'rect', x: page.x + 40, y: page.y + 30, w: page.w, h: page.h, radius: 26, fill: colors.accent }),
            shape({ id: 'page', kind: 'rect', ...page, radius: 22, fill: '#FFFFFF', stroke: lighten(colors.ink, 0.85), strokeWidth: 2 }),
            ...Array.from({ length: 6 }, (_, i) => shape({ id: `ring${i}`, kind: 'ellipse', x: page.x + page.w * (0.12 + i * 0.152) - 10, y: page.y - 22, w: 20, h: 44, stroke: '#B8860B', strokeWidth: 6 })),
            ...(list.length ? [shape({ id: 'line', kind: 'rect', x: M, y: h - M + 6, w: W - M * 2, h: 3, fill: colors.accent })] : []),
            ...list.slice(1).map((_, i) => shape({ id: `divider${i}`, kind: 'rect', x: M + colW * (i + 1), y: h * 0.82, w: 2, h: h * 0.08, fill: lighten(colors.ink, 0.6) })),
          ],
          layers: [
            ...line('footer', 'footer', t.footer, M, M - 20, W * 0.6, 50, 32, colors.ink, { weight: 800 }),
            text({ id: 'kicker2', role: 'kicker', text: script, x: M, y: h * 0.11, width: W - M * 2, height: h * 0.09, size: 110, font: 'script', weight: 400, color: colors.ink, align: 'center', valign: 'bottom' }),
            text({ id: 'headline', role: 'headline', text: big, x: M, y: h * 0.19, width: W - M * 2, height: h * 0.14, size: 170, weight: 800, color: colors.ink, align: 'center', valign: 'middle', letterSpacing: -0.03 }),
            text({ id: 'kicker', role: 'kicker', text: month, x: page.x + 30, y: page.y + 30, width: page.w - 60, height: page.h * 0.2, size: 70, weight: 800, italic: true, color: colors.ink, align: 'center', valign: 'middle' }),
            text({ id: 'cta', role: 'headline', text: day, x: page.x + 30, y: page.y + page.h * 0.26, width: page.w - 60, height: page.h * 0.66, size: 260, weight: 800, italic: true, color: colors.ink, align: 'center', valign: 'middle', lineHeight: 0.9 }),
            ...list.map((it, i) => text({ id: `item${i}`, role: 'body', text: it, x: M + colW * i, y: h * 0.84, width: colW, height: h * 0.05, size: 28, weight: 700, color: colors.ink, align: 'center', valign: 'middle', uppercase: true })),
          ],
        });
      },
    },
  ],
});

/* ———————————————————————— More layouts for two original styles ———————————————————————— */

const limePrompt = (idea: string, c: Colors, where: string, k?: Cast) =>
  `Vibrant advertising photo in fresh lime green (${c.main}) tones about this idea: "${idea}". ${where}${castLine(k)} People wear lime-green clothes; the product is ${obj(k, 'a large silver phone')} with no logo. A few floating translucent glass cubes and thin light rings, lime green gradient studio background, glossy commercial light. ${NO_TEXT}`;

const LIME_RED = '#E5322D';

export const NEON_LIME_LAYOUTS: RecipeLayout[] = [
  {
    id: 'side',
    name: 'Words on the right',
    example: { headline: 'The phone everyone’s talking about', body: 'Now available with us', kicker: 'Get yours now', footer: 'Volt Gadgets' },
    imagePrompt: (idea, c, k) => limePrompt(idea, c, 'One stylish person holding the phone toward the camera in the left half of the frame; the right half is clear background.', k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const ink = inkOn(photo, colors.ink);
      return design('neon-lime', 'side', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, ink, { weight: 700 }),
          rich({ id: 'headline', role: 'headline', x: W * 0.5, y: h * 0.36, width: W * 0.5 - M, height: h * 0.2, size: 80, weight: 800, color: ink, lineHeight: 1.0, letterSpacing: -0.02 }, t.headline, { bold: true, fallback: 0 }),
          ...line('body', 'body', t.body, W * 0.5, h * 0.57, W * 0.5 - M, h * 0.07, 28, ink),
          ...pill('kicker', t.kicker, W * 0.5, h * 0.66, colors.accent, W * 0.5 - M, 26),
        ],
      });
    },
  },
  {
    id: 'corner',
    name: 'Headline top, product bottom',
    example: { headline: 'Level up your gadgets', body: 'Nova 17 Pro', kicker: 'Shop now', footer: 'Volt Gadgets' },
    imagePrompt: (idea, c, k) => limePrompt(idea, c, 'A person in a lime cap holds the phone to their ear, close to the camera, in the right half of the frame; the upper left and lower left are clear.', k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const ink = inkOn(photo, colors.ink);
      return design('neon-lime', 'corner', format, colors, {
        background: photoBg(photo),
        layers: [
          text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: M + 40, width: W * 0.58, height: h * 0.18, size: 84, weight: 800, color: ink, lineHeight: 1.0, letterSpacing: -0.02 }),
          ...line('body', 'body', t.body, M, h * 0.76, W * 0.5, h * 0.14, 76, '#FFFFFF', { weight: 800, lineHeight: 0.98, valign: 'bottom' }),
          ...pill('kicker', t.kicker, W - M - 280, h - M - 80, colors.accent, 280, 26, 'right'),
          ...line('footer', 'footer', t.footer, W * 0.5, M - 20, W * 0.5 - M, 44, 26, ink, { weight: 700, align: 'right' }),
        ],
      });
    },
  },
  {
    id: 'centre-red',
    name: 'Centred with a red button',
    example: { headline: 'Don’t wait', body: 'Own the power of the Nova 17 Pro now', kicker: 'Order yours now', footer: 'Volt Gadgets' },
    imagePrompt: (idea, c, k) => limePrompt(idea, c, 'One smiling person holding the phone close to the camera, centred in the lower 65% of the frame; the top third is clear.', k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const ink = inkOn(photo, colors.ink);
      return design('neon-lime', 'centre-red', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W - M * 2, 44, 26, ink, { weight: 700, align: 'center' }),
          text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: h * 0.08, width: W - M * 2, height: h * 0.12, size: 110, weight: 800, color: '#FFFFFF', align: 'center', valign: 'middle', letterSpacing: -0.02 }),
          ...line('body', 'body', t.body, M * 2, h * 0.2, W - M * 4, h * 0.09, 40, ink, { weight: 700, align: 'center' }),
          ...pill('kicker', t.kicker, M, h - M - 90, LIME_RED, W - M * 2, 26, 'center'),
        ],
      });
    },
  },
  {
    id: 'step',
    name: 'Floating phone',
    example: { headline: 'Step into *the future*', body: 'Sleek design, next-level power.', kicker: 'Order yours now', footer: 'Volt Gadgets' },
    imagePrompt: (idea, c, k) => limePrompt(idea, c, 'A large floating phone in the left middle of the frame, and one person in a dynamic pose in the lower right; the top left is clear.', k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const ink = inkOn(photo, colors.ink);
      return design('neon-lime', 'step', format, colors, {
        background: photoBg(photo),
        layers: [
          rich({ id: 'headline', role: 'headline', x: M, y: M + 30, width: W * 0.56, height: h * 0.16, size: 84, weight: 600, color: ink, lineHeight: 1.0 }, t.headline, { bold: true, color: readable('#FFFFFF', colors.main, 1.2), fallback: 2 }),
          ...line('body', 'body', t.body, M, M + 40 + h * 0.16, W * 0.5, h * 0.07, 26, ink),
          ...line('footer', 'footer', t.footer, W * 0.5, M - 20, W * 0.5 - M, 44, 26, ink, { weight: 700, align: 'right' }),
          ...pill('kicker', t.kicker, M, h - M - 80, LIME_RED, 340, 24),
        ],
      });
    },
  },
  {
    id: 'group',
    name: 'Group behind',
    example: { headline: 'Upgrade your lifestyle with the all-new Nova', kicker: 'Shop now', footer: 'Volt Gadgets' },
    imagePrompt: (idea, c, k) => limePrompt(idea, c, 'A group of four or five people fanned out behind one person who holds the phone forward, filling the lower 70% of the frame; the top 25% is clear.', k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const ink = inkOn(photo, colors.ink);
      return design('neon-lime', 'group', format, colors, {
        background: photoBg(photo),
        layers: [
          text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: M, width: W - M * 2, height: h * 0.16, size: 74, weight: 800, color: ink, align: 'center', valign: 'middle', lineHeight: 1.02 }),
          ...pill('kicker', t.kicker, W - M - 260, h - M - 80, colors.accent, 260, 24, 'right'),
          ...line('footer', 'footer', t.footer, M, h - M - 40, W * 0.5, 44, 26, '#FFFFFF', { weight: 700 }),
        ],
      });
    },
  },
];

const redPrompt = (idea: string, where: string, bg: string, k?: Cast) =>
  `Glossy 3D advertising render about this idea: "${idea}". ${where}${castLine(k)}${k?.object ? ` The product shown is ${k.object}.` : ''} ${bg} Studio lighting, soft reflections, bold and playful. ${NO_TEXT}`;

const RED_WHITE: Colors = { main: '#FFFFFF', ink: '#C8102E', accent: '#C8102E' };

export const BRAND_RED_LAYOUTS: RecipeLayout[] = [
  {
    id: 'white-page',
    name: 'White page, red object',
    colors: RED_WHITE,
    example: { headline: 'No buffering, *just fast internet*', body: 'T&C apply', footer: 'Pulse Mobile' },
    imagePrompt: (idea, c, k) => redPrompt(idea, 'A large glossy red 3D object that symbolises the idea, with one or two tiny happy people sitting on it, in the lower right two-thirds of the frame.', `Clean ${c.main === '#FFFFFF' ? 'white' : c.main} background; the upper left is empty.`, k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const ink = inkOn(photo, colors.ink);
      return design('brand-red', 'white-page', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, ink, { weight: 800 }),
          rich({ id: 'headline', role: 'headline', x: M, y: M + 50, width: W * 0.56, height: h * 0.16, size: 72, weight: 800, color: ink, lineHeight: 1.0, letterSpacing: -0.02 }, t.headline, { color: '#14141A', bold: true, fallback: 0 }),
          ...line('body', 'body', t.body, M, h - M - 30, W * 0.5, 36, 20, ink, { italic: true }),
        ],
      });
    },
  },
  {
    id: 'big-number',
    name: 'Giant offer number',
    example: { headline: '9GB data for 5 months', kicker: 'Only ₦900', body: 'T&C apply', footer: 'Pulse Mobile' },
    imagePrompt: (idea, c, k) => redPrompt(idea, 'Glossy red 3D shapes and a small object that fits the idea in the lower corners of the frame; the centre is empty.', `A deep red (${c.main}) to dark red gradient background.`, k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      const big = giantWord(plain(t.headline)!);
      const rest = plain(t.headline)!.trim().split(/\s+/).slice(1).join(' ');
      return design('brand-red', 'big-number', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, colors.ink, { weight: 800 }),
          text({ id: 'headline', role: 'headline', text: big, x: 20, y: h * 0.3, width: W - 40, height: h * 0.26, size: 340, font: 'archivo', weight: 400, color: colors.ink, align: 'center', valign: 'middle', lineHeight: 0.9, uppercase: true }),
          ...line('body2', 'body', rest, M, h * 0.16, W - M * 2, h * 0.12, 64, colors.ink, { weight: 800, align: 'center', valign: 'bottom' }),
          ...pill('kicker', t.kicker, M, h * 0.58, colors.accent, W - M * 2, 34, 'center'),
          ...line('body', 'body', t.body, W * 0.5, h - M - 30, W * 0.5 - M, 36, 20, colors.ink, { italic: true, align: 'right' }),
        ],
      });
    },
  },
  {
    id: 'top-left',
    name: 'Small headline, object right',
    example: { headline: 'Always stay connected', body: 'T&C apply', footer: 'Pulse Mobile' },
    imagePrompt: (idea, c, k) => redPrompt(idea, 'A large glossy red 3D object that symbolises the idea, with tiny people on it, in the right two-thirds of the frame.', `A deep red (${c.main}) to dark red gradient background; the upper left is empty.`, k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      return design('brand-red', 'top-left', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, colors.ink, { weight: 800 }),
          text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: M + 50, width: W * 0.5, height: h * 0.14, size: 64, weight: 800, color: colors.ink, lineHeight: 1.02 }),
          ...line('body', 'body', t.body, M, h - M - 30, W * 0.5, 36, 20, colors.ink, { italic: true }),
        ],
      });
    },
  },
  {
    id: 'person',
    name: 'Person with the product',
    example: { headline: 'Get the 5G router today!', kicker: 'Enjoy unlimited browsing', body: 'T&C apply', footer: 'Pulse Mobile' },
    imagePrompt: (idea, c, k) =>
      `Bright advertising photo about this idea: "${idea}": one smiling person in a red top holding ${obj(k, 'an unbranded white product')} toward the camera, upper body, in the lower right of the frame, on a deep red (${c.main}) gradient studio background. The upper left is empty.${castLine(k)} ${NO_TEXT}`,
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      return design('brand-red', 'person', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W * 0.5, 44, 26, colors.ink, { weight: 800 }),
          text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: M + 50, width: W * 0.56, height: h * 0.18, size: 80, weight: 800, color: colors.ink, lineHeight: 1.0, letterSpacing: -0.02 }),
          ...line('kicker', 'kicker', t.kicker, M, M + 60 + h * 0.18, W * 0.5, 44, 28, colors.ink),
          ...line('body', 'body', t.body, M, h - M - 30, W * 0.5, 36, 20, colors.ink, { italic: true }),
        ],
      });
    },
  },
  {
    id: 'box',
    name: 'Product in the middle',
    example: { headline: 'Enjoy gifts and offers', kicker: 'Dial *123# to start', body: 'T&C apply', footer: 'Pulse Mobile' },
    imagePrompt: (idea, c, k) => redPrompt(idea, 'One glossy red 3D product or gift box that symbolises the idea, centred in the frame, slightly below the middle.', `A deep red (${c.main}) gradient background; the top quarter is empty.`, k),
    build({ text: t, format, photo, colors }) {
      const h = heightOf(format);
      return design('brand-red', 'box', format, colors, {
        background: photoBg(photo),
        layers: [
          ...line('footer', 'footer', t.footer, M, M - 20, W - M * 2, 44, 26, colors.ink, { weight: 800, align: 'center' }),
          text({ id: 'headline', role: 'headline', text: plain(t.headline)!, x: M, y: M + 40, width: W - M * 2, height: h * 0.14, size: 80, weight: 800, color: colors.ink, align: 'center', valign: 'middle', lineHeight: 1.0 }),
          ...pill('kicker', t.kicker, M, h - M - 110, colors.accent, W - M * 2, 28, 'center'),
          ...line('body', 'body', t.body, M, h - M - 30, W - M * 2, 36, 20, colors.ink, { italic: true, align: 'center' }),
        ],
      });
    },
  },
];

/** The new styles, families first */
export const FAMILY_RECIPES: StyleRecipe[] = [FRAME_BUBBLE, SOFT_PASTEL_MONEY, CONCEPT_OBJECT, SAFE_HOLD, CLINIC_EDITORIAL, STRIKE_THROUGH, BLOB_POP, RIBBON_CELEBRATION, TORN_PAPER, MINIATURE_WORLD, FIRE_MONEY, BIG_DATE];
