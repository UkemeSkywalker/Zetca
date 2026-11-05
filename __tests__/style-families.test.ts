/**
 * @jest-environment node
 */
import { buildPost, isFamily, layoutsOf, pickLayout, rebuildDesign, recipeById, recipeColors, RECIPES, textOfDesign } from '@/lib/design/recipes';
import { markup } from '@/lib/design/recipeKit';
import { cleanDesignText } from '@/lib/models/designWriter';
import { contrastRatio } from '@/lib/design/contrast';
import { DesignDocSchema, type PhotoBackground } from '@/lib/design/types';

const photo: PhotoBackground = {
  kind: 'photo',
  photoId: '00000000-0000-4000-8000-000000000001',
  width: 864,
  height: 1152,
  focusX: 0.5,
  focusY: 0.5,
  fit: 'fill',
  tones: ['#7a5a3a', '#e8d2b0'],
  credit: { name: 'Higgsfield AI', url: 'https://higgsfield.ai/', source: 'ai' },
};
const cutout = { photoId: '00000000-0000-4000-8000-000000000002', width: 864, height: 1152 };

describe('accent and crossed-out words', () => {
  it('reads *accent* and ~~crossed out~~ words into word ranges', () => {
    expect(markup('A queen and her ~~pawns~~ *children.*')).toEqual({ text: 'A queen and her pawns children.', accent: [[5, 6]], strike: [[4, 5]] });
    expect(markup('Smart savings\nwith *Zero Drama*')).toEqual({ text: 'Smart savings\nwith Zero Drama', accent: [[3, 5]], strike: [] });
    expect(markup('No markers here').accent).toEqual([]);
  });

  it('draws the accent words differently and never shows the markers', () => {
    const r = recipeById('strike-through')!;
    const doc = r.build({ text: r.example, format: 'portrait', photo, colors: r.colors, cutout });
    const h = doc.layers.find((l) => l.id === 'headline')!;
    expect(h.text).not.toMatch(/[*~]/);
    expect(h.marks).toEqual(expect.arrayContaining([expect.objectContaining({ from: 4, to: 5, strike: expect.any(String) }), expect.objectContaining({ from: 5, to: 6, color: r.colors.accent })]));
  });
});

describe('style families', () => {
  it('has families with several layouts and single styles with one', () => {
    expect(layoutsOf(recipeById('frame-bubble')!)).toHaveLength(6);
    expect(layoutsOf(recipeById('neon-lime')!)).toHaveLength(6);
    expect(layoutsOf(recipeById('brand-red')!)).toHaveLength(6);
    expect(isFamily(recipeById('concept-object')!)).toBe(false);
    expect(isFamily(recipeById('marble-thinker')!)).toBe(false);
  });

  it('spreads a campaign across the layouts when mixing, or always uses the one chosen', () => {
    const r = recipeById('safe-hold')!;
    const mixed = new Set([0, 1, 2, 3].map((n) => pickLayout(r, 'mix', n).id));
    expect(mixed.size).toBe(4);
    expect(new Set([0, 1, 2, 3].map((n) => pickLayout(r, 'right', n).id))).toEqual(new Set(['right']));
  });

  it('gives each pastel post its own colour, unless the campaign has brand colours', () => {
    const r = recipeById('soft-pastel-money')!;
    expect(recipeColors(r, undefined, 'top').main).not.toBe(recipeColors(r, undefined, 'split').main);
    const brand = { main: '#FFF4E0', ink: '#4A2C1D', accent: '#E0A526' };
    expect(recipeColors(r, brand, 'top').main).toBe('#FFF4E0');
    expect(recipeColors(r, brand, 'split').main).toBe('#FFF4E0');
  });

  it('keeps text readable when brand colours would hide it', () => {
    for (const r of RECIPES) {
      const c = recipeColors(r, { main: '#111111', ink: '#222222' });
      expect(contrastRatio(c.ink, c.main)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('draws the page in the chosen colour behind a cut-out', () => {
    const r = recipeById('safe-hold')!;
    const colors = { main: '#0E7C66', ink: '#FFFFFF', accent: '#FFD24A' };
    const doc = buildPost(r, 'centre', { text: r.example, format: 'portrait', photo, colors, cutout });
    expect(doc.background).toEqual({ kind: 'solid', color: '#0E7C66' });
    expect(doc.images?.[0]).toMatchObject({ id: 'subject', cutout: true });
    // The AI photo is kept, to switch layouts later
    expect(doc.photo?.photoId).toBe(photo.photoId);
    // Without a cut-out it falls back to the photo, which was made on the style's colour
    const plain = buildPost(r, 'centre', { text: r.example, format: 'portrait', photo, colors });
    expect(plain.background.kind).toBe('photo');
    expect(plain.shapes?.some((s) => s.id === 'steps')).toBe(false);
  });

  it('rebuilds a post in new colours or another layout with the same words and pictures', () => {
    const r = recipeById('clinic-editorial')!;
    const first = buildPost(r, 'board', { text: { headline: 'Habits that *make it worse*', footer: 'Lekki Vein', cta: 'See the tips' }, format: 'portrait', photo, colors: r.colors, cutout });
    expect(textOfDesign(first).headline).toBe('Habits that *make it worse*');
    const recoloured = rebuildDesign(first, { colors: { main: '#FFF4E0', ink: '#4A2C1D', accent: '#E0A526' } });
    expect(recoloured.background).toEqual({ kind: 'solid', color: '#FFF4E0' });
    expect(recoloured.layoutId).toBe('board');
    const moved = rebuildDesign(recoloured, { layoutId: 'object' });
    expect(moved.layoutId).toBe('object');
    expect(moved.colors?.main).toBe('#FFF4E0');
    expect(moved.layers.find((l) => l.id === 'headline')?.text).toBe('Habits that make it worse');
    expect(moved.layers.find((l) => l.id === 'cta')?.text).toBe('See the tips');
    expect(moved.images?.[0].photoId).toBe(cutout.photoId);
    expect(DesignDocSchema.safeParse(moved).success).toBe(true);
  });

  it('draws Big Date without an AI image', () => {
    const r = recipeById('big-date')!;
    expect(layoutsOf(r)[0].noImage).toBe(true);
    const doc = r.build({ text: r.example, format: 'portrait', photo, colors: r.colors });
    expect(doc.background.kind).toBe('solid');
    expect(doc.layers.find((l) => l.id === 'cta')?.text).toBe('01');
    expect(textOfDesign(doc).headline).toBe('Happy New Month');
  });
});

describe('pictures follow the brand, not the style’s examples', () => {
  const cast = { people: 'Black women in their late 20s with natural hair', object: 'a jar of whipped shea butter' };

  it('puts the brand’s kind of people in every picture with people, and its product in the object-only ones', () => {
    // These show an object, not people
    const objectOnly = new Set(['concept-object', 'strike-through', 'fire-money']);
    for (const r of RECIPES) {
      for (const l of layoutsOf(r).filter((x) => !x.noImage)) {
        const prompt = l.imagePrompt('Glow that lasts all day', l.colors ?? r.colors, cast);
        if (objectOnly.has(r.id)) {
          if (!prompt.includes('shea butter')) throw new Error(`${r.id}/${l.id} ignores the brand's product`);
        } else if (!prompt.includes(cast.people)) throw new Error(`${r.id}/${l.id} ignores the brand's people`);
      }
    }
  });

  it('swaps the style’s example people and products for the brand’s', () => {
    const marble = recipeById('marble-thinker')!.imagePrompt('x', recipeById('marble-thinker')!.colors, cast);
    expect(marble).not.toMatch(/bearded Greek philosopher/);
    const safe = layoutsOf(recipeById('safe-hold')!)[0].imagePrompt('x', recipeById('safe-hold')!.colors, cast);
    expect(safe).toContain('shea butter');
    expect(safe).not.toMatch(/a phone/);
    const lime = layoutsOf(recipeById('neon-lime')!)[1].imagePrompt('x', recipeById('neon-lime')!.colors, cast);
    expect(lime).toContain('shea butter');
    expect(lime).not.toMatch(/silver phone/);
  });

  it('keeps the style’s own subject when nothing is known about the brand', () => {
    const marble = recipeById('marble-thinker')!.imagePrompt('x', recipeById('marble-thinker')!.colors);
    expect(marble).toMatch(/bearded Greek philosopher/);
    expect(marble).not.toMatch(/Everyone in the picture/);
  });

  it('keeps who and what the writer chose', () => {
    const out = cleanDesignText({ styleId: 'headline-body', headline: 'Glow on', body: 'All day.', imagePrompt: 'x', photoQuery: 'skin care', people: ' Black women\nin their 30s ', object: 'a jar of shea butter' });
    expect(out).toMatchObject({ people: 'Black women in their 30s', object: 'a jar of shea butter' });
  });
});
