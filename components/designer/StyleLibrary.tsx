'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { FAMILY_NAMES, RECIPES, type RecipeFamily, type StyleRecipe } from '@/lib/design/recipes';
import type { DesignDoc, FormatId } from '@/lib/design/types';
import { DesignCanvas } from './DesignCanvas';
import { loadPhoto, tonesOf } from './photos';
import { CARD } from './ui';

/**
 * A recipe's example post, made from the example image that ships with Zetca
 * (and its cut-out, for giant-word styles)
 */
export function useRecipeExample(recipe: StyleRecipe, format: FormatId = 'portrait'): DesignDoc | null {
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      const img = await loadPhoto({ photoId: `style:${recipe.id}` });
      const cut = recipe.cutout ? await loadPhoto({ photoId: `style:${recipe.id}-cut` }).catch(() => null) : null;
      if (!live) return;
      setDoc(
        recipe.build({
          text: recipe.example,
          format,
          colors: recipe.colors,
          photo: {
            kind: 'photo',
            photoId: `style:${recipe.id}`,
            width: img.width,
            height: img.height,
            focusX: 0.5,
            focusY: 0.5,
            fit: 'fill',
            tones: tonesOf(img),
            credit: { name: 'Higgsfield AI', url: 'https://higgsfield.ai/', source: 'ai' },
          },
          cutout: cut ? { photoId: `style:${recipe.id}-cut`, width: cut.width, height: cut.height } : undefined,
        })
      );
    })().catch(() => undefined);
    return () => {
      live = false;
    };
  }, [recipe, format]);
  return doc;
}

const FAMILIES = Object.keys(FAMILY_NAMES) as RecipeFamily[];

/** The style library: every style, as a real example post */
export function StyleLibrary() {
  const [family, setFamily] = useState<RecipeFamily | 'all'>('all');
  const shown = family === 'all' ? RECIPES : RECIPES.filter((r) => r.family === family);
  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div>
        <Link href="/dashboard/designer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <Icon icon="lucide:arrow-left" className="w-4 h-4" aria-hidden /> Designer
        </Link>
        <h1 className="mt-2 text-[34px] font-bold font-heading tracking-tight text-[#0B1C30]">Pick a style</h1>
        <p className="text-[15px] text-[#464555]">Every post follows it, with new words and a new image each time.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Style families">
        {(['all', ...FAMILIES] as const).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={family === f}
            onClick={() => setFamily(f)}
            className={`h-9 rounded-full px-4 text-sm font-semibold transition-colors ${family === f ? 'bg-primary text-white' : 'bg-white border border-[#E2E8F0] text-[#0B1C30] hover:border-primary/40'}`}
          >
            {f === 'all' ? 'All' : FAMILY_NAMES[f]}
          </button>
        ))}
      </div>

      <div className={`columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4 [&>*]:mb-4`}>
        {shown.map((r) => (
          <StyleCard key={r.id} recipe={r} />
        ))}
      </div>
    </div>
  );
}

function StyleCard({ recipe }: { recipe: StyleRecipe }) {
  const doc = useRecipeExample(recipe);
  return (
    <Link href={`/dashboard/designer/styles/${recipe.id}`} className={`${CARD} group block break-inside-avoid overflow-hidden p-2.5 hover:border-primary/40 hover:-translate-y-0.5 transition`}>
      <div className="relative overflow-hidden rounded-xl bg-[#F1F5F9] aspect-[4/5]">
        {doc ? <DesignCanvas doc={doc} resolution={0.35} className="h-full w-full" /> : <div className="h-full w-full animate-pulse bg-[#E8EDF5]" />}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B1C30] shadow">Use this style</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-1 pt-2.5">
        <span className="truncate text-sm font-semibold text-[#0B1C30]">{recipe.name}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <Icon icon="lucide:sparkles" className="w-3 h-3" aria-hidden /> AI image
        </span>
      </div>
    </Link>
  );
}
