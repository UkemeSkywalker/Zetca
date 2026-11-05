/**
 * @jest-environment node
 */
import { buildPost, layoutsOf, rebuildDesign, RECIPES, recipeColors } from '@/lib/design/recipes';
import { carouselSlides, exampleCarouselWords, CLOSING_ID, CONTENT_LAYOUTS, contentSlide, MAX_SLIDES, renumber, slideTextOf, withSlideAdded, withSlideMoved, withSlideRemoved } from '@/lib/design/carousel';
import { colorsBehind } from '@/lib/design/types';
import { lowContrastLayers } from '@/lib/design/edit';
import { contrastRatio } from '@/lib/design/contrast';
import { DesignDocSchema, DesignInputSchema, type PhotoBackground } from '@/lib/design/types';
import { CopyVisualSchema } from '@/lib/models/copy';
import { ManualScheduleInputSchema } from '@/lib/models/scheduler';
import { cleanDesignText } from '@/lib/models/designWriter';

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

const words = {
  slides: [
    { headline: 'Your photos don’t match your bread', body: 'Real sourdough deserves photos that show every golden crust.' },
    { headline: 'Post when people are hungry', body: 'Mornings and late afternoons get the most saves.' },
    { headline: 'Show the hands behind it' },
  ],
  closing: { headline: 'Ready for a *fresh look?*', cta: 'Book a call' },
  footer: 'Crumb & Co.',
};

describe('carousels', () => {
  it('makes a cover, the content slides and a closing slide in every style and format', () => {
    for (const r of RECIPES) {
      const layout = layoutsOf(r)[0];
      for (const format of ['square', 'portrait', 'story'] as const) {
        const colors = recipeColors(r, undefined, layout.id);
        const cover = buildPost(r, layout.id, { text: layout.example, format, photo, colors });
        const slides = [cover, ...carouselSlides(cover, words, colors, photo)];
        expect(slides).toHaveLength(5);
        for (const s of slides) {
          const parsed = DesignDocSchema.safeParse(s);
          if (!parsed.success) throw new Error(`${r.id}/${format}: ${parsed.error.message}`);
          expect(s.format).toBe(format);
          expect(s.styleId).toBe(r.id);
        }
        expect(slides[4].layoutId).toBe(CLOSING_ID);
        expect(slides[4].layers.find((l) => l.id === 'cta')?.text).toBe('Book a call');
        expect(slides.slice(1).map((s) => s.layers.find((l) => l.id === 'count')?.text)).toEqual(['2/5', '3/5', '4/5', '5/5']);
      }
    }
  });

  it('keeps every slide’s words readable on their page', () => {
    for (const r of RECIPES) {
      const colors = recipeColors(r);
      for (const layout of CONTENT_LAYOUTS) {
        const s = contentSlide(layout.id, { styleId: r.id, format: 'portrait', colors, index: 1, total: 4, text: words.slides[0], footer: 'Crumb & Co.', photo });
        const page = (s.background as { color: string }).color;
        for (const id of ['footer', 'count']) {
          const l = s.layers.find((x) => x.id === id)!;
          expect(contrastRatio(l.color, page)).toBeGreaterThanOrEqual(4.5);
        }
        const body = s.layers.find((x) => x.id === 'body')!;
        const behind = s.shapes?.find((x) => x.id === 'body-card')?.fill ?? page;
        expect(contrastRatio(body.color, behind)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('rebuilds a slide in new colours or another layout with the same words', () => {
    const r = RECIPES.find((x) => x.id === 'frame-bubble')!;
    const colors = recipeColors(r);
    const cover = buildPost(r, 'bubble', { text: layoutsOf(r)[0].example, format: 'portrait', photo, colors });
    const [first] = carouselSlides(cover, words, colors, photo);
    const brand = { main: '#FFF4E0', ink: '#4A2C1D', accent: '#E0A526' };
    const recoloured = rebuildDesign(first, { colors: brand });
    expect(recoloured.background).toEqual({ kind: 'solid', color: '#FFF4E0' });
    expect(slideTextOf(recoloured).headline).toBe(words.slides[0].headline);
    const moved = rebuildDesign(recoloured, { layoutId: 'slide:photo-top' });
    expect(moved.layoutId).toBe('slide:photo-top');
    expect(moved.images?.[0]).toMatchObject({ id: 'photo', photoId: photo.photoId });
    expect(moved.layers.find((l) => l.id === 'count')?.text).toBe('2/5');
  });

  it('renumbers slides after they move', () => {
    const r = RECIPES[0];
    const s = contentSlide('number-left', { styleId: r.id, format: 'portrait', colors: recipeColors(r), index: 3, total: 6, text: words.slides[0] });
    const moved = renumber(s, 1, 4);
    expect(moved.layers.find((l) => l.id === 'num')?.text).toBe('01');
    expect(moved.layers.find((l) => l.id === 'count')?.text).toBe('2/4');
  });

  it('stores slides on designs, posts and scheduled posts, cover first', () => {
    const r = RECIPES[0];
    const colors = recipeColors(r);
    const cover = buildPost(r, undefined, { text: r.example, format: 'portrait', photo, colors });
    const slides = [cover, ...carouselSlides(cover, words, colors)];
    expect(DesignInputSchema.safeParse({ name: 'Carousel', doc: cover, slides, mediaId: 'm1', mediaIds: ['m1', 'm2', 'm3', 'm4', 'm5'] }).success).toBe(true);
    expect(CopyVisualSchema.safeParse({ kind: 'carousel', media_id: 'm1', media_type: 'image', media_ids: ['m1', 'm2'] }).success).toBe(true);
    expect(CopyVisualSchema.safeParse({ kind: 'carousel', media_id: 'm2', media_type: 'image', media_ids: ['m1', 'm2'] }).success).toBe(false);
    expect(ManualScheduleInputSchema.safeParse({ scheduled_date: '2030-01-01', scheduled_time: '09:00', platform: 'linkedin', media_ids: ['m1', 'm2'] }).success).toBe(true);
  });

  it('keeps the writer’s slides, closing line and button', () => {
    const out = cleanDesignText({
      styleId: 'headline-body',
      headline: 'Bread that sells',
      imagePrompt: 'x',
      photoQuery: 'bread',
      slides: [{ headline: 'Point one', body: 'Why it matters.' }, { headline: '' }],
      closing: 'Ready to start?',
      cta: 'Book a call',
    });
    expect(out.slides).toEqual([{ headline: 'Point one', body: 'Why it matters.' }]);
    expect(out).toMatchObject({ closing: 'Ready to start?', cta: 'Book a call' });
  });

  describe('editing the slides', () => {
    const r = RECIPES.find((x) => x.id === 'safe-hold')!;
    const colors = recipeColors(r);
    const cover = buildPost(r, 'centre', { text: layoutsOf(r)[0].example, format: 'portrait', photo, colors });
    const start = [cover, ...carouselSlides(cover, words, colors, photo)];
    const heads = (all: typeof start) => all.map((s) => s.layers.find((l) => l.id === 'headline')?.text);
    const counts = (all: typeof start) => all.slice(1).map((s) => s.layers.find((l) => l.id === 'count')?.text);

    it('adds a slide before the closing slide, or after the one picked, and renumbers', () => {
      const added = withSlideAdded(start, 1);
      expect(added).toHaveLength(6);
      expect(heads(added)[2]).toBe('A new point');
      expect(counts(added)).toEqual(['2/6', '3/6', '4/6', '5/6', '6/6']);
      expect(added[5].layoutId).toBe(CLOSING_ID);
      // Never past the limit
      let many = start;
      for (let i = 0; i < 10; i++) many = withSlideAdded(many);
      expect(many).toHaveLength(MAX_SLIDES);
    });

    it('moves content slides among themselves, never past the cover or the closing slide', () => {
      const moved = withSlideMoved(start, 1, 1);
      expect(heads(moved).slice(1, 3)).toEqual([heads(start)[2], heads(start)[1]]);
      expect(counts(moved)).toEqual(counts(start));
      expect(withSlideMoved(start, 1, -1)).toBe(start);
      expect(withSlideMoved(start, 3, 1)).toBe(start);
      expect(withSlideMoved(start, 0, 1)).toBe(start);
    });

    it('removes a content slide but keeps the cover, one point and the closing slide', () => {
      const removed = withSlideRemoved(start, 2);
      expect(removed).toHaveLength(4);
      expect(counts(removed)).toEqual(['2/4', '3/4', '4/4']);
      expect(withSlideRemoved(start, 0)).toBe(start);
      expect(withSlideRemoved(start, 4)).toBe(start);
      const small = withSlideRemoved(withSlideRemoved(start, 1), 1);
      expect(small).toHaveLength(3);
      expect(withSlideRemoved(small, 1)).toBe(small);
    });

    it('checks text against the card or bubble it sits on, and big words at 3:1', () => {
      for (const s of start.slice(1)) expect(lowContrastLayers(s)).toEqual([]);
      const body = start[1].layers.find((l) => l.id === 'body')!;
      expect(colorsBehind(start[1], body)).toEqual([start[1].shapes!.find((x) => x.id === 'body-card')!.fill]);
    });
  });

  it('makes the style dialog’s example carousel at any slide count', () => {
    for (const total of [3, 5, 10]) {
      const w = exampleCarouselWords(total, 'Northbeam');
      expect(w.slides).toHaveLength(total - 2);
      const r = RECIPES.find((x) => x.id === 'frame-bubble')!;
      const cover = buildPost(r, 'bubble', { text: layoutsOf(r)[0].example, format: 'portrait', photo, colors: recipeColors(r) });
      expect([cover, ...carouselSlides(cover, w, recipeColors(r), photo)]).toHaveLength(total);
    }
  });

  it('keeps Frame & Bubble’s white headline readable on its coral bubble', () => {
    const r = RECIPES.find((x) => x.id === 'frame-bubble')!;
    const doc = buildPost(r, 'bubble', { text: layoutsOf(r)[0].example, format: 'portrait', photo, colors: recipeColors(r) });
    expect(lowContrastLayers(doc).map((l) => l.id)).not.toContain('headline');
  });
});
