'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { buildPost, examplePhotoId, layoutOf, layoutsOf, NO_PHOTO, recipeColors, type StyleRecipe } from '@/lib/design/recipes';
import type { Colors } from '@/lib/design/recipeKit';
import type { DesignDoc, FormatId } from '@/lib/design/types';
import { DesignCanvas } from './DesignCanvas';
import { loadPhoto, tonesOf } from './photos';
import { CARD } from './ui';

/**
 * A recipe's example post, made from the example image that ships with Zetca
 * (and its cut-out, for styles that cut the subject out), in one of the
 * style's layouts and, optionally, other colours
 */
export function useRecipeExample(recipe: StyleRecipe, format: FormatId = 'portrait', layoutId?: string, colors?: Colors): DesignDoc | null {
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  const colorKey = colors ? `${colors.main}${colors.ink}${colors.accent}` : '';
  useEffect(() => {
    let live = true;
    (async () => {
      const layout = layoutOf(recipe, layoutId);
      const use = colors ?? recipeColors(recipe, undefined, layout.id);
      if (layout.noImage) {
        if (live) setDoc(buildPost(recipe, layout.id, { text: layout.example, format, colors: use, photo: NO_PHOTO }));
        return;
      }
      const photoId = examplePhotoId(recipe, layout.id);
      const img = await loadPhoto({ photoId });
      const cutId = `${photoId}-cut`;
      const cut = layout.cutout ? await loadPhoto({ photoId: cutId }).catch(() => null) : null;
      if (!live) return;
      setDoc(
        buildPost(recipe, layout.id, {
          text: layout.example,
          format,
          colors: use,
          photo: {
            kind: 'photo',
            photoId,
            width: img.width,
            height: img.height,
            focusX: 0.5,
            focusY: 0.5,
            fit: 'fill',
            tones: tonesOf(img),
            credit: { name: 'Higgsfield AI', url: 'https://higgsfield.ai/', source: 'ai' },
          },
          cutout: cut ? { photoId: cutId, width: cut.width, height: cut.height } : undefined,
        })
      );
    })().catch(() => undefined);
    return () => {
      live = false;
    };
    // colours by value, not by object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe, format, layoutId, colorKey]);
  return doc;
}

/** "6 layouts" or "1 layout" */
export function LayoutCount({ recipe, className = '' }: { recipe: StyleRecipe; className?: string }) {
  const n = layoutsOf(recipe).length;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${n > 1 ? 'bg-primary-50 text-primary' : 'bg-[#F1F5F9] text-[#464555]'} ${className}`}>
      {n > 1 && <Icon icon="lucide:layers" className="w-3 h-3" aria-hidden />}
      {n} {n === 1 ? 'layout' : 'layouts'}
    </span>
  );
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
        <LayoutCount recipe={recipe} />
      </div>
    </button>
  );
}
