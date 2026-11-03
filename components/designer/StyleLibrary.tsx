'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import type { StyleRecipe } from '@/lib/design/recipes';
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

/** An AI style as a real example post; opens its details */
export function RecipeCard({ recipe, onOpen }: { recipe: StyleRecipe; onOpen: () => void }) {
  const doc = useRecipeExample(recipe);
  return (
    <button type="button" onClick={onOpen} className={`${CARD} group block w-full overflow-hidden p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-lg`}>
      <div className="relative overflow-hidden rounded-xl bg-[#F1F5F9] aspect-[4/5]">
        {doc ? <DesignCanvas doc={doc} resolution={0.35} className="h-full w-full" /> : <div className="h-full w-full animate-pulse bg-[#E8EDF5]" />}
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
          <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B1C30] shadow">Use this style</span>
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-1 pt-3">
        <span className="truncate text-sm font-bold text-[#0B1C30]">{recipe.name}</span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary">
          <Icon icon="lucide:sparkles" className="w-3 h-3" aria-hidden /> AI image
        </span>
      </div>
    </button>
  );
}
