import { Anton, Archivo_Black, Bebas_Neue, DM_Serif_Display, Plus_Jakarta_Sans } from 'next/font/google';
import type { FontFamilies } from '@/lib/design/render';
import type { FontId } from '@/lib/design/types';

const anton = Anton({ subsets: ['latin'], weight: '400' });
const bebas = Bebas_Neue({ subsets: ['latin'], weight: '400' });
const archivo = Archivo_Black({ subsets: ['latin'], weight: '400' });
const serif = DM_Serif_Display({ subsets: ['latin'], weight: '400' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '600', '700', '800'] });

export const FONT_FAMILIES: FontFamilies = {
  anton: anton.style.fontFamily,
  bebas: bebas.style.fontFamily,
  archivo: archivo.style.fontFamily,
  jakarta: jakarta.style.fontFamily,
  serif: serif.style.fontFamily,
};

export const FONT_OPTIONS: { id: FontId; name: string }[] = [
  { id: 'anton', name: 'Anton' },
  { id: 'bebas', name: 'Bebas Neue' },
  { id: 'archivo', name: 'Archivo Black' },
  { id: 'jakarta', name: 'Plus Jakarta Sans' },
  { id: 'serif', name: 'DM Serif' },
];

let ready: Promise<void> | null = null;

/** Resolves once every design font has loaded, so the canvas draws them (not a fallback) */
export function loadDesignFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  ready ??= Promise.all(
    (Object.keys(FONT_FAMILIES) as FontId[]).flatMap((id) =>
      (id === 'jakarta' ? [400, 600, 700, 800] : [400]).map((w) => document.fonts.load(`${w} 40px ${FONT_FAMILIES[id]}`))
    )
  ).then(() => undefined, () => undefined);
  return ready;
}
