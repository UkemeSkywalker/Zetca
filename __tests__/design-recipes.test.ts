/**
 * @jest-environment node
 */
import { giantWord, recipeById, recipeColors, RECIPES } from '@/lib/design/recipes';
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
  it('each makes a valid design in every format', () => {
    for (const r of RECIPES) {
      for (const format of ['square', 'portrait', 'story'] as const) {
        const doc = r.build({ text: r.example, format, photo, colors: r.colors, cutout: { photoId: '00000000-0000-4000-8000-000000000002', width: 864, height: 1152 } });
        expect(DesignDocSchema.safeParse(doc).success).toBe(true);
        expect(doc.styleId).toBe(r.id);
      }
    }
  });

  it('asks the AI for no text or logos, and uses the style colour', () => {
    for (const r of RECIPES) {
      const prompt = r.imagePrompt('Good bread takes time', r.colors);
      expect(prompt).toContain('Good bread takes time');
      expect(prompt).toMatch(/no text/i);
      expect(prompt).toMatch(/logo/i);
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
