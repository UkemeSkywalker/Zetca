'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { FAMILY_NAMES, layoutOf, layoutsOf, RECIPES, recipeById, type StyleRecipe } from '@/lib/design/recipes';
import { creditsFor } from '@/lib/billing/prices';
import { DEFAULT_IMAGE_MODEL, imageCredits, imageModel } from '@/lib/billing/aiModels';
import { DesignCanvas } from '@/components/designer/DesignCanvas';
import { LayoutCount, useRecipeExample } from '@/components/designer/StyleLibrary';
import { StyleDialog } from '@/components/designer/StyleDetail';
import { forgetBrandPalettes } from '@/components/designer/StyleChoices';
import type { CampaignDesignStyle } from '@/types/strategy';

export type CampaignStyleValue = CampaignDesignStyle;

/**
 * Credits one post's visual costs in a style: the AI image, its cut-out if any,
 * and the words. Mixing layouts: the dearest layout, so it's never more.
 */
export function styleCreditsPerPost(style: Pick<CampaignStyleValue, 'recipeId' | 'model' | 'layout'>): number {
  const recipe = recipeById(style.recipeId);
  if (!recipe) return 1;
  const model = imageModel(style.model ?? DEFAULT_IMAGE_MODEL);
  const used = !style.layout || style.layout === 'mix' ? layoutsOf(recipe) : [layoutOf(recipe, style.layout)];
  return Math.max(...used.map((l) => (l.noImage ? 0 : imageCredits(model) + (l.cutout ? creditsFor(0.04) : 0)))) + 1;
}

/** "Mixing 6 layouts · Crumb & Co. colours" */
function styleSummary(recipe: StyleRecipe, value: CampaignStyleValue, brandName: string): string {
  const n = layoutsOf(recipe).length;
  const layouts = n === 1 ? 'One layout' : !value.layout || value.layout === 'mix' ? `Mixing ${n} layouts` : `Always “${layoutOf(recipe, value.layout).name}”`;
  return `${layouts} · ${value.colors ? `${brandName} colours` : 'Style colours'}`;
}

/**
 * The campaign's design style, above the Copywriter's posts: every new post's
 * visual follows it, each with its own words and image.
 */
export function CampaignStyleBar({
  value,
  onChange,
  saving,
  brandName,
}: {
  value?: CampaignStyleValue;
  onChange: (next: CampaignStyleValue | null) => void;
  saving?: boolean;
  /** The campaign's brand, to name its colours */
  brandName: string;
}) {
  const [picking, setPicking] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const recipe = value ? recipeById(value.recipeId) : undefined;
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#e5eeff] bg-white px-4 py-3">
        {recipe ? (
          <>
            <Thumb recipe={recipe} className="h-12 w-10" />
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#0b1c30]">
                Style: {recipe.name}{' '}
                <button type="button" onClick={() => setOpened(recipe.id)} className="ml-1 text-[13px] font-semibold text-[#4f46e5] hover:underline">
                  Change
                </button>
              </p>
              <p className="text-[12px] text-[#777587]">
                {styleSummary(recipe, value!, brandName)} · {styleCreditsPerPost(value!)} credits a post
              </p>
            </div>
            <label className="ml-auto inline-flex items-center gap-2 text-[13px] font-medium text-[#464555]">
              Use on new posts
              <button
                type="button"
                role="switch"
                aria-checked={value!.onNewPosts}
                disabled={saving}
                onClick={() => onChange({ ...value!, onNewPosts: !value!.onNewPosts })}
                className={`relative h-6 w-11 rounded-full transition-colors ${value!.onNewPosts ? 'bg-[#4f46e5]' : 'bg-[#cbd5e1]'}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value!.onNewPosts ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </label>
          </>
        ) : (
          <>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-[#4f46e5]" aria-hidden>
              <Icon icon="lucide:palette" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-[#0b1c30]">Give this campaign one look</p>
              <p className="text-[12px] text-[#777587]">Pick a style and every post’s visual follows it, with its own words and image.</p>
            </div>
            <button type="button" onClick={() => setPicking(true)} className="rounded-xl bg-[#4f46e5] px-4 py-2 text-[13px] font-semibold text-white hover:opacity-95">
              Pick a style
            </button>
          </>
        )}
      </div>
      {picking && (
        <StylePicker
          current={value?.recipeId}
          onClose={() => setPicking(false)}
          onPick={(id) => {
            setPicking(false);
            setOpened(id);
          }}
          onRemove={value ? () => (setPicking(false), onChange(null)) : undefined}
        />
      )}
      {opened && (
        <StyleDialog
          id={opened}
          onClose={() => setOpened(null)}
          campaign={{
            brandName,
            saving,
            initial: opened === value?.recipeId ? { colors: value.colors, layout: value.layout, model: value.model } : value?.colors ? { colors: value.colors } : undefined,
            onBack: () => {
              setOpened(null);
              setPicking(true);
            },
            onUse: (choice) => {
              setOpened(null);
              forgetBrandPalettes();
              onChange({ recipeId: choice.recipeId, model: choice.model, onNewPosts: true, colors: choice.colors, layout: choice.layout });
            },
          }}
        />
      )}
    </>
  );
}

function Thumb({ recipe, className = '' }: { recipe: StyleRecipe; className?: string }) {
  const doc = useRecipeExample(recipe);
  return (
    <span className={`block shrink-0 overflow-hidden rounded-lg bg-[#f1f5f9] ${className}`}>
      {doc && <DesignCanvas doc={doc} resolution={0.2} className="h-full w-full object-cover" />}
    </span>
  );
}

/** All the styles, as real examples, to pick one for the campaign */
function StylePicker({ current, onPick, onClose, onRemove }: { current?: string; onPick: (id: string) => void; onClose: () => void; onRemove?: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Pick a style" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">Pick your campaign’s look</h2>
            <p className="text-sm text-[#464555]">Every post follows it, with new words and a new image each time. Styles with several layouts can mix them post by post.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-[#464555] hover:bg-[#f1f5f9]">
            <Icon icon="lucide:x" className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              className={`group rounded-2xl border p-2 text-left transition hover:-translate-y-0.5 ${current === r.id ? 'border-[#4f46e5] ring-2 ring-[#4f46e5]' : 'border-[#e2e8f0] hover:border-[#4f46e5]/40'}`}
            >
              <Thumb recipe={r} className="aspect-[4/5] w-full rounded-xl" />
              <span className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[#0b1c30]">{r.name}</span>
                <LayoutCount recipe={r} />
              </span>
              <span className="block truncate text-[11px] text-[#777587]">{FAMILY_NAMES[r.family]}</span>
            </button>
          ))}
        </div>
        {onRemove && (
          <button type="button" onClick={onRemove} className="mt-5 text-sm font-semibold text-[#ba1a1a] hover:underline">
            Don’t use a style for this campaign
          </button>
        )}
      </div>
    </div>
  );
}
