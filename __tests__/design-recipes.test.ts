/**
 * @jest-environment node
 */
import { FAMILY_NAMES, giantWord, layoutsOf, recipeById, recipeColors, RECIPES } from '@/lib/design/recipes';
import { DesignDocSchema, type PhotoBackground } from '@/lib/design/types';
import { contrastRatio } from '@/lib/design/contrast';

const photo: PhotoBackground = {
  kind: 'photo',
  photoId: '00000000-0000-4000-8000-000000000001',
  width: 864,
  height: 1152,
  focusX: 0.3,
  focusY: 0.3,
  fit: 'fill',
  tones: ['#7a5a3a', '#e8d2b0'],
  credit: { name: 'Higgsfield AI', url: 'https://higgsfield.ai/', source: 'ai' },
};

describe('style recipes', () => {
  it('each layout makes a valid design in every format, with and without its cut-out', () => {
    for (const r of RECIPES) {
      for (const layout of layoutsOf(r)) {
        for (const format of ['square', 'portrait', 'story', 'landscape'] as const) {
          for (const cutout of [{ photoId: '00000000-0000-4000-8000-000000000002', width: 864, height: 1152 }, undefined]) {
            const doc = layout.build({ text: layout.example, format, photo, colors: layout.colors ?? r.colors, cutout });
            const parsed = DesignDocSchema.safeParse(doc);
            if (!parsed.success) throw new Error(`${r.id}/${layout.id}/${format}: ${parsed.error.message}`);
            expect(doc.styleId).toBe(r.id);
          }
        }
      }
    }
  });

  it('keeps the 19 original styles and adds the new ones, each with its own id and a known family', () => {
    for (const id of ['marble-thinker', 'word-behind', 'mono-studio', 'blueprint-thinker', 'sticker-portrait', 'collage-zine', 'neon-lime', 'electric-blue', 'brand-red', 'glow-numeral', 'while-others-blur', 'sky-product', 'dark-luxe', 'celebration-script', 'reach-out', 'sharp-in-crowd', '3d-crew', 'marker-highlight', 'street-flyer'])
      expect(recipeById(id)).toBeDefined();
    expect(RECIPES).toHaveLength(31);
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(31);
    for (const r of RECIPES) {
      expect(FAMILY_NAMES[r.family]).toBeTruthy();
      expect(new Set(layoutsOf(r).map((l) => l.id)).size).toBe(layoutsOf(r).length);
    }
  });

  it('puts words behind a cut-out in every giant-word style', () => {
    for (const r of RECIPES.filter((x) => x.cutout && x.family === 'giant-word')) {
      const doc = r.build({ text: r.example, format: 'portrait', photo, colors: r.colors, cutout: { photoId: 'cut', width: 864, height: 1152 } });
      expect(doc.layers.some((l) => l.behind)).toBe(true);
      expect(doc.images).toHaveLength(1);
    }
  });

  it('asks the AI for no text or logos, and uses the style colour', () => {
    for (const r of RECIPES) {
      for (const layout of layoutsOf(r).filter((l) => !l.noImage)) {
        const prompt = layout.imagePrompt('Good bread takes time', r.colors);
        expect(prompt).toContain('Good bread takes time');
        expect(prompt).toMatch(/no text/i);
        expect(prompt).toMatch(/logo/i);
      }
    }
    expect(recipeById('marble-thinker')!.imagePrompt('x', { main: '#FFF4E0', ink: '#4A2C1D', accent: '#E0A526' })).toContain('#FFF4E0');
  });

  it('puts the giant word behind the cut-out, lined up with the photo', () => {
    const r = recipeById('word-behind')!;
    const doc = r.build({ text: { headline: 'Rise and shine', footer: 'Crumb & Co.' }, format: 'portrait', photo, colors: r.colors, cutout: { photoId: 'cut', width: 864, height: 1152 } });
    const word = doc.layers.find((l) => l.role === 'headline')!;
    expect(word).toMatchObject({ text: 'RISE', behind: true });
    expect(doc.images).toEqual([expect.objectContaining({ photoId: 'cut', x: 0, y: 0, w: 1080, h: 1350, cutout: true, cover: true })]);
    // The photo and the cut-out are cropped the same way
    expect(doc.background).toMatchObject({ focusX: 0.5, focusY: 0.5 });
    // The rest of the headline goes on the small line
    expect(doc.layers.find((l) => l.role === 'body')?.text).toBe('and shine');
  });

  it('keeps text readable in brand colours', () => {
    const r = recipeById('marble-thinker')!;
    const c = recipeColors(r, { main: '#4A2C1D', ink: '#3A2010' });
    expect(contrastRatio(c.main, c.ink)).toBeGreaterThanOrEqual(4.5);
    expect(giantWord('  Knead, then wait')).toBe('Knead');
  });
});
