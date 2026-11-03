'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { FAMILY_NAMES, recipeById } from '@/lib/design/recipes';
import { creditsFor } from '@/lib/billing/prices';
import type { FormatId } from '@/lib/design/types';
import { DesignCanvas } from './DesignCanvas';
import { useRecipeExample } from './StyleLibrary';
import { CARD } from './ui';

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

/**
 * One style, in a pop-up on the Designer page: what it looks like, what stays
 * the same, and how much each post costs
 */
export function StyleDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const recipe = recipeById(id);
  const [format, setFormat] = useState<FormatId>('portrait');
  const [quality, setQuality] = useState<(typeof QUALITIES)[number]['id']>('qwen-image-3');
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);
  if (!recipe) return null;
  const cutout = recipe.cutout ? creditsFor(0.04) : 0;
  const perPost = (usd: number) => creditsFor(usd) + cutout;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={recipe.name} onClick={onClose}>
    <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-[#F8F9FF] p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-[#464555] shadow-sm hover:bg-[#F1F5F9]">
        <Icon icon="lucide:x" className="w-5 h-5" aria-hidden />
      </button>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Post shape">
            {FORMATS_SHOWN.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={format === f.id}
                onClick={() => setFormat(f.id)}
                className={`h-9 rounded-full px-4 text-sm font-semibold ${format === f.id ? 'bg-primary text-white' : 'bg-white border border-[#E2E8F0] text-[#0B1C30]'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Example id={recipe.id} format={format} />
          <p className="text-sm text-[#777587]">An example. Your posts get their own words and a new image in this style.</p>
        </div>

        <aside className={`${CARD} p-6 space-y-6`}>
          <div>
            <h1 className="text-2xl font-bold font-heading text-[#0B1C30]">{recipe.name}</h1>
            <span className="mt-2 inline-block rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-semibold text-[#464555]">{FAMILY_NAMES[recipe.family]}</span>
            <p className="mt-3 text-sm text-[#464555]">{recipe.description}.</p>
          </div>
          <Chips title="Stays the same" items={[['lucide:layout-grid', 'Layout'], ['lucide:type', 'Fonts'], ['lucide:sparkles', 'Look']]} />
          <Chips title="Changes every post" items={[['lucide:quote', 'Words'], ['lucide:image', 'Image']]} />
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#777587]">Image quality</p>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Image quality">
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
            {cutout > 0 && <p className="mt-2 text-xs text-[#777587]">Includes {cutout} credits to cut out the subject, so the big word can go behind it.</p>}
          </div>
          <Link
            href={`/dashboard/designer/new?source=ai_image&format=${format}&recipe=${recipe.id}&model=${quality}`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-white hover:bg-primary/90"
          >
            Use this style <Icon icon="lucide:arrow-right" className="w-4 h-4" aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
    </div>
  );
}

function Example({ id, format }: { id: string; format: FormatId }) {
  const doc = useRecipeExample(recipeById(id)!, format);
  return (
    <div className={`${CARD} p-3 max-w-[560px]`}>
      {doc ? <DesignCanvas doc={doc} resolution={0.6} className="rounded-xl" /> : <div className="aspect-[4/5] rounded-xl bg-[#E8EDF5] animate-pulse" />}
    </div>
  );
}

function Chips({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[#777587]">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map(([icon, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F5F9] px-3 py-1.5 text-sm font-medium text-[#0B1C30]">
            <Icon icon={icon} className="w-4 h-4 text-[#64748B]" aria-hidden /> {label}
          </span>
        ))}
      </div>
    </div>
  );
}
