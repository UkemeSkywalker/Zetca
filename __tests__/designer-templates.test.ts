import { contrastRatio, bestTextColor, blend, passes, MIN_CONTRAST } from '@/lib/design/contrast';
import { fitText, wrapLines } from '@/lib/design/textFit';
import { PALETTES, STYLES, restyle, textOf, variationPalettes, paletteById } from '@/lib/design/styles';
import { cleanDesignText } from '@/lib/models/designWriter';
import { backgroundColors, DesignDocSchema, FORMAT_IDS } from '@/lib/design/types';

// Every character is `size * 0.6` wide: enough to test wrapping and shrinking
const measure = (text: string, size: number) => text.length * size * 0.6;

describe('contrast', () => {
  it('matches the WCAG ratios for black and white', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  it('picks the text colour that stands out', () => {
    expect(bestTextColor(['#FACC15'])).toBe('#0B0B0F');
    expect(bestTextColor(['#15803D'])).toBe('#FFFFFF');
  });

  it('checks every colour of a gradient', () => {
    expect(passes('#FFFFFF', ['#0B0B0F', '#FFFFFF'])).toBe(false);
  });

  it('blends an overlay over a colour', () => {
    expect(blend('#FFFFFF', '#000000', 0.5)).toBe('#808080');
  });
});

describe('fitting text', () => {
  it('wraps words and keeps typed line breaks', () => {
    expect(wrapLines('show up\nanyway today', 10, 70, measure)).toEqual(['show up', 'anyway', 'today']);
  });

  it('shrinks text so long words are never cut off', () => {
    const fitted = fitText('SHOW UP ANYWAY.', { maxSize: 200, width: 600, height: 900, lineHeight: 1 }, measure);
    for (const line of fitted.lines) expect(measure(line, fitted.size)).toBeLessThanOrEqual(600);
    expect(fitted.lines.join(' ')).toBe('SHOW UP ANYWAY.');
    expect(fitted.size).toBeLessThan(200);
  });

  it('shrinks until all lines fit the box height', () => {
    const text = 'one two three four five six seven eight nine ten';
    const fitted = fitText(text, { maxSize: 120, width: 400, height: 300, lineHeight: 1.2 }, measure);
    expect(fitted.height).toBeLessThanOrEqual(300);
  });

  it('keeps the largest size when the text already fits', () => {
    expect(fitText('Hi', { maxSize: 100, width: 900, height: 200, lineHeight: 1 }, measure).size).toBe(100);
  });
});

describe('styles', () => {
  it.each(PALETTES.map((p) => [p.id, p]))('palette %s has high-contrast text', (_id, p) => {
    expect(contrastRatio(p.text, p.background)).toBeGreaterThanOrEqual(MIN_CONTRAST);
  });

  const cases = STYLES.flatMap((style) => PALETTES.flatMap((palette) => FORMAT_IDS.map((format) => [style.id, palette.id, format] as const)));

  it.each(cases)('%s in %s (%s) is valid and every text layer contrasts', (styleId, paletteId, format) => {
    const style = STYLES.find((s) => s.id === styleId)!;
    const doc = style.build(style.example, format, paletteById(paletteId));
    expect(DesignDocSchema.safeParse(doc).success).toBe(true);
    for (const layer of doc.layers) {
      const behind = layer.fill ? [layer.fill] : backgroundColors(doc);
      expect(contrastRatio(layer.color, behind[0])).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(passes(layer.color, behind)).toBe(true);
    }
  });

  it('keeps the words when switching style', () => {
    const doc = STYLES[0].build({ kicker: 'Daily', headline: 'Show up', footer: '@me' }, 'square', PALETTES[0]);
    const moved = restyle(doc, 'announcement', PALETTES[1], 'story');
    expect(textOf(moved)).toMatchObject({ kicker: 'Daily', headline: 'Show up', footer: '@me' });
    expect(moved.format).toBe('story');
  });

  it('offers 4 different palettes per style', () => {
    for (const style of STYLES) expect(new Set(variationPalettes(style).map((p) => p.id)).size).toBe(4);
  });
});

describe('design writer output', () => {
  it('turns a written "\\n" into a real line break and drops quotes and hashtags', () => {
    expect(cleanDesignText({ styleId: 'bold-statement', headline: '"Show up\\neven on empty" #fit', photoQuery: 'gym' }).headline).toBe('Show up\neven on empty fit');
  });
  it('keeps the supporting line only for tip cards', () => {
    expect(cleanDesignText({ styleId: 'glow', headline: 'Hi', body: 'More', photoQuery: '' }).body).toBeUndefined();
  });
});
