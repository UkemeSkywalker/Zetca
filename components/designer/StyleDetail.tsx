'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { FAMILY_NAMES, layoutOf, layoutsOf, recipeById, recipeColors, type StyleRecipe } from '@/lib/design/recipes';
import { carouselSlides, exampleCarouselWords, MAX_SLIDES, MIN_SLIDES } from '@/lib/design/carousel';
import type { Colors } from '@/lib/design/recipeKit';
import { creditsFor } from '@/lib/billing/prices';
import type { FormatId } from '@/lib/design/types';
import { DesignCanvas } from './DesignCanvas';
import { LayoutCount, useRecipeExample } from './StyleLibrary';
import { ColorChooser, colorsOf, LayoutModeChooser, useBrandPalettes, type ColorChoice } from './StyleChoices';

/** Image quality choices for a style, by AI model (credits from the model's real cost + 40%) */
const QUALITIES = [
  { id: 'z-image-turbo', label: 'Quick', usd: 0.015 },
  { id: 'qwen-image-3', label: 'Better', usd: 0.04 },
  { id: 'grok-image-2', label: 'Bold', usd: 0.06 },
] as const;

const FORMATS_SHOWN: { id: FormatId; label: string }[] = [
  { id: 'portrait', label: 'Feed 4:5' },
  { id: 'square', label: 'Square' },
  { id: 'story', label: 'Story 9:16' },
];

/** What the user chose in the dialog */
export interface StyleChoice {
  recipeId: string;
  /** Undefined: the style's own colours */
  colors?: Colors;
  /** 'mix', or the one layout every post uses */
  layout: string;
  model: string;
}

/** Credits for one post in a layout: the AI image, its cut-out, and nothing for layouts drawn by Zetca */
export function layoutCredits(recipe: StyleRecipe, layoutId: string | undefined, usd: number): number {
  const l = layoutOf(recipe, layoutId);
  if (l.noImage) return 0;
  return creditsFor(usd) + (l.cutout ? creditsFor(0.04) : 0);
}

/**
 * One style, in a pop-up: its layouts, its colours, how a campaign's posts use
 * the layouts, and the price per post. On the Designer page it starts a
 * design; for a campaign (`campaign`) it sets the campaign's look.
 */
export function StyleDialog({
  id,
  onClose,
  campaign,
}: {
  id: string;
  onClose: () => void;
  campaign?: { brandName: string; initial?: Partial<StyleChoice>; onUse: (choice: StyleChoice) => void; onBack?: () => void; saving?: boolean };
}) {
  const recipe = recipeById(id);
  const layouts = recipe ? layoutsOf(recipe) : [];
  const initialLayout = campaign?.initial?.layout;
  const [format, setFormat] = useState<FormatId>('portrait');
  /** A single post, or a carousel of this many slides (on the Designer page only) */
  const [postType, setPostType] = useState<'single' | 'carousel'>('single');
  const [slideCount, setSlideCount] = useState(5);
  const isCarousel = !campaign && postType === 'carousel';
  const [layoutId, setLayoutId] = useState<string>(initialLayout && initialLayout !== 'mix' ? initialLayout : (layouts[0]?.id ?? 'main'));
  const [mix, setMix] = useState(initialLayout ? initialLayout === 'mix' : true);
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]['id']>((campaign?.initial?.model as (typeof QUALITIES)[number]['id']) ?? 'qwen-image-3');
  const brands = useBrandPalettes();
  const [color, setColor] = useState<ColorChoice>(campaign?.initial?.colors ? { kind: 'brand', name: campaign.brandName, colors: campaign.initial.colors } : { kind: 'style' });
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  if (!recipe) return null;

  const family = layouts.length > 1;
  const layout = layoutOf(recipe, layoutId);
  const colors = colorsOf(color) ? recipeColors(recipe, colorsOf(color), layout.id) : undefined;
  // The campaign's own brand is always offered, even before it has colours saved
  const brandList = campaign && !brands.some((b) => b.name === campaign.brandName) && color.kind === 'brand' ? [{ name: color.name, colors: color.colors }, ...brands] : brands;
  const perPost = (usd: number) => {
    const shown = family && mix && !isCarousel ? layouts : [layout];
    return Math.max(...shown.map((l) => layoutCredits(recipe, l.id, usd))) + 1;
  };
  const choice: StyleChoice = { recipeId: recipe.id, colors: colorsOf(color), layout: family && mix ? 'mix' : layout.id, model: quality };
  const createHref = () => {
    const q = new URLSearchParams({ source: 'ai_image', format, recipe: recipe.id, model: quality, layout: layout.id, ...(isCarousel ? { carousel: String(slideCount) } : {}) });
    const c = colorsOf(color);
    if (c) q.set('colors', [c.main, c.ink, c.accent].join(',').replace(/#/g, ''));
    return `/dashboard/designer/new?${q}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label={recipe.name} onClick={onClose}>
      <div className="relative grid max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-3xl bg-white lg:grid-cols-[1fr_400px] lg:overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full bg-[#F1F5F9] p-2 text-[#464555] hover:bg-[#E2E8F0]">
          <Icon icon="lucide:x" className="w-5 h-5" aria-hidden />
        </button>

        <div className="min-w-0 space-y-4 bg-[#F8F9FF] p-5 sm:p-7 lg:overflow-y-auto">
          {!campaign && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Post type">
              {(['single', 'carousel'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={postType === t}
                  onClick={() => setPostType(t)}
                  className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${postType === t ? 'bg-[#0B1C30] text-white' : 'border border-[#E2E8F0] bg-white text-[#0B1C30]'}`}
                >
                  <Icon icon={t === 'single' ? 'lucide:square' : 'lucide:gallery-horizontal'} className="h-4 w-4" aria-hidden />
                  {t === 'single' ? 'Single post' : 'Carousel'}
                </button>
              ))}
              {isCarousel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-white px-1 py-0.5">
                  <button type="button" aria-label="Fewer slides" disabled={slideCount <= MIN_SLIDES} onClick={() => setSlideCount((n) => n - 1)} className="rounded-full p-1.5 text-[#464555] hover:bg-[#F1F5F9] disabled:opacity-30">
                    <Icon icon="lucide:minus" className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="min-w-[70px] text-center text-sm font-semibold text-[#0B1C30]">{slideCount} slides</span>
                  <button type="button" aria-label="More slides" disabled={slideCount >= MAX_SLIDES} onClick={() => setSlideCount((n) => n + 1)} className="rounded-full p-1.5 text-[#464555] hover:bg-[#F1F5F9] disabled:opacity-30">
                    <Icon icon="lucide:plus" className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Post shape">
            {FORMATS_SHOWN.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={format === f.id}
                onClick={() => setFormat(f.id)}
                className={`h-9 rounded-full px-4 text-sm font-semibold ${format === f.id ? 'bg-primary text-white' : 'border border-[#E2E8F0] bg-white text-[#0B1C30]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {isCarousel ? (
            <CarouselPreview recipe={recipe} format={format} layoutId={layout.id} colors={colors} total={slideCount} />
          ) : (
            <Preview recipe={recipe} format={format} layoutId={layout.id} colors={colors} />
          )}
          {isCarousel && <p className="text-center text-xs text-[#64748B]">The cover uses this style’s layout; the slides follow in its colours and fonts. Only the cover needs an AI image.</p>}
          {family && (
            <div>
              {isCarousel && <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[#777587]">Cover layout</p>}
              <div className="flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Layouts">
                {layouts.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    role="radio"
                    aria-checked={l.id === layout.id}
                    aria-label={l.name}
                    title={l.name}
                    onClick={() => setLayoutId(l.id)}
                    className={`w-[76px] shrink-0 overflow-hidden rounded-xl border-2 bg-white transition ${l.id === layout.id ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
                  >
                    <LayoutThumb recipe={recipe} layoutId={l.id} colors={colors} />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-[#64748B]">
                {layout.name}{isCarousel ? '' : ` · ${mix ? 'each post can use a different layout' : 'every post uses this layout'}`}
              </p>
            </div>
          )}
          {!family && <p className="text-center text-xs text-[#64748B]">An example. Your posts get their own words and a new image in this style.</p>}
        </div>

        <aside className="flex min-w-0 flex-col gap-6 p-6 sm:p-7 lg:overflow-y-auto">
          <div className="pr-10">
            {campaign?.onBack && (
              <button type="button" onClick={campaign.onBack} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                <Icon icon="lucide:arrow-left" className="h-4 w-4" aria-hidden /> All styles
              </button>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold font-heading text-[#0B1C30]">{recipe.name}</h1>
              <LayoutCount recipe={recipe} />
            </div>
            <p className="mt-2 text-sm text-[#464555]">{recipe.description}.</p>
            <span className="mt-2 inline-block rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-semibold text-[#464555]">{FAMILY_NAMES[recipe.family]}</span>
          </div>

          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#777587]">Colours</h2>
            <ColorChooser value={color} onChange={setColor} styleColors={recipeColors(recipe, undefined, layout.id)} brands={brandList} />
          </section>

          {family && !isCarousel && (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#777587]">Layouts on each post</h2>
              <LayoutModeChooser mix={mix} onChange={setMix} layoutName={layout.name} />
            </section>
          )}

          {!layout.noImage || (family && mix) ? (
            <section>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#777587]">Image quality</h2>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Image quality">
                {QUALITIES.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    role="radio"
                    aria-checked={quality === q.id}
                    onClick={() => setQuality(q.id)}
                    className={`rounded-xl border px-2 py-2.5 text-center ${quality === q.id ? 'border-primary bg-primary-50 text-primary' : 'border-[#E2E8F0] text-[#0B1C30] hover:border-primary/40'}`}
                  >
                    <span className="block text-sm font-semibold">{q.label}</span>
                    <span className="block text-xs opacity-80">{perPost(q.usd)} credits</span>
                  </button>
                ))}
              </div>
              {layout.cutout && <p className="mt-2 text-xs text-[#777587]">Includes {creditsFor(0.04)} credits to cut out the subject, so its page can take any colour.</p>}
            </section>
          ) : (
            <p className="text-sm text-[#464555]">Drawn by Zetca, no AI image: 1 credit for the words.</p>
          )}

          <div className="mt-auto flex items-center gap-3 border-t border-[#E2E8F0] pt-5">
            {campaign ? (
              <button
                type="button"
                disabled={campaign.saving}
                onClick={() => campaign.onUse(choice)}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
              >
                Use for this campaign <Icon icon="lucide:arrow-right" className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <Link href={createHref()} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90">
                {isCarousel ? 'Make a carousel' : 'Use this style'} <Icon icon="lucide:arrow-right" className="w-4 h-4" aria-hidden />
              </Link>
            )}
            <span className="text-xs text-[#64748B]">
              {family && mix && !isCarousel ? 'Up to ' : ''}
              {perPost(QUALITIES.find((q) => q.id === quality)!.usd)} credits {isCarousel ? 'a carousel' : 'a post'}
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Preview({ recipe, format, layoutId, colors }: { recipe: StyleRecipe; format: FormatId; layoutId: string; colors?: Colors }) {
  const doc = useRecipeExample(recipe, format, layoutId, colors);
  return (
    <div className="mx-auto w-full max-w-[460px] rounded-2xl bg-white p-2.5 shadow-sm">
      {doc ? <DesignCanvas doc={doc} resolution={0.6} className="rounded-xl" /> : <div className="aspect-[4/5] animate-pulse rounded-xl bg-[#E8EDF5]" />}
    </div>
  );
}

/** The cover, then the example's slides in the same colours, as a strip */
function CarouselPreview({ recipe, format, layoutId, colors, total }: { recipe: StyleRecipe; format: FormatId; layoutId: string; colors?: Colors; total: number }) {
  const cover = useRecipeExample(recipe, format, layoutId, colors);
  const slides = useMemo(() => {
    if (!cover) return [];
    const use = colors ?? recipeColors(recipe, undefined, layoutId);
    const photo = cover.photo ?? (cover.background.kind === 'photo' ? cover.background : undefined);
    return [cover, ...carouselSlides(cover, exampleCarouselWords(total, layoutOf(recipe, layoutId).example.footer), use, photo)];
  }, [cover, colors, recipe, layoutId, total]);
  if (!slides.length) return <div className="mx-auto aspect-[4/5] w-full max-w-[460px] animate-pulse rounded-2xl bg-[#E8EDF5]" />;
  return (
    <div className="flex snap-x gap-3 overflow-x-auto rounded-2xl bg-white p-3 shadow-sm" aria-label={`Example carousel, ${slides.length} slides`}>
      {slides.map((s, i) => (
        <div key={i} className="w-[46%] shrink-0 snap-start sm:w-[38%]">
          <DesignCanvas doc={s} resolution={0.35} className="rounded-xl" />
          <p className="mt-1 text-center text-[11px] font-semibold text-[#64748B]">{i === 0 ? 'Cover' : i === slides.length - 1 ? 'Closing' : `Slide ${i + 1}`}</p>
        </div>
      ))}
    </div>
  );
}

function LayoutThumb({ recipe, layoutId, colors }: { recipe: StyleRecipe; layoutId: string; colors?: Colors }) {
  const doc = useRecipeExample(recipe, 'portrait', layoutId, colors);
  return doc ? <DesignCanvas doc={doc} resolution={0.15} /> : <div className="aspect-[4/5] animate-pulse bg-[#E8EDF5]" />;
}
