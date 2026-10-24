'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { STYLES, paletteById, type DesignStyle, type StyleCategory } from '@/lib/design/styles';
import { FORMATS, FORMAT_IDS, type DesignRecord, type FormatId } from '@/lib/design/types';
import { createDesign, designerPath, listDesigns, rememberedHandle } from '@/lib/api/designApi';
import { DesignCanvas, DesignThumb } from './DesignCanvas';
import { CARD, Chip, CostBadge, timeAgo } from './ui';
import { CreditsPill, useAiCredits } from './AiCredits';

type Filter = 'all' | StyleCategory | 'ai_image' | 'ai_video';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bold', label: 'Bold text' },
  { id: 'quote', label: 'Quote' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'tips', label: 'Tips' },
  { id: 'photo', label: 'Photo + text' },
  { id: 'ai_image', label: 'AI image' },
  { id: 'ai_video', label: 'AI video' },
];

/** Sources still being built, shown honestly as "Soon" */
const AI_CARDS: { id: 'ai_image' | 'ai_video'; name: string; description: string; icon: string; cost: number; gradient: string }[] = [
  { id: 'ai_image', name: 'AI image', description: 'A new image made from your description', icon: 'lucide:sparkles', cost: 1, gradient: 'from-fuchsia-600 via-violet-600 to-indigo-700' },
  { id: 'ai_video', name: 'AI video', description: 'A 5-second clip made from your description', icon: 'lucide:clapperboard', cost: 5, gradient: 'from-orange-500 via-rose-600 to-purple-700' },
];

export function DesignerHome() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState<FormatId>('square');
  const [filter, setFilter] = useState<Filter>('all');
  const [designs, setDesigns] = useState<DesignRecord[] | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listDesigns().then(setDesigns, () => setDesigns([]));
  }, []);

  const styles = useMemo(() => STYLES.filter((s) => filter === 'all' || s.category === filter), [filter]);
  const aiCards = AI_CARDS.filter((c) => filter === 'all' || c.id === filter);
  const { credits } = useAiCredits();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ format });
    if (prompt.trim()) params.set('prompt', prompt.trim());
    router.push(`/dashboard/designer/new?${params}`);
  };

  const startFromStyle = async (style: DesignStyle) => {
    setStarting(style.id);
    setError('');
    try {
      const handle = rememberedHandle();
      const doc = style.build({ ...style.example, footer: style.example.footer?.startsWith('@') ? handle || style.example.footer : style.example.footer }, format, paletteById(style.palette));
      const design = await createDesign({ name: style.name, source: 'template', doc });
      router.push(designerPath(design.designId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t start that design');
      setStarting(null);
    }
  };

  return (
    <div className="space-y-10 max-w-[1200px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-bold font-heading text-[#0B1C30]">Designer</h1>
        <CreditsPill credits={credits} />
      </div>

      <section
        className="relative overflow-hidden rounded-3xl px-6 py-12 sm:px-12 sm:py-14 text-center"
        style={{ background: 'linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #7C3AED 100%)' }}
        aria-labelledby="designer-hero"
      >
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-fuchsia-400/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 right-0 h-80 w-80 rounded-full bg-sky-400/25 blur-3xl" />
        <div className="relative">
          <h2 id="designer-hero" className="text-3xl sm:text-[44px] leading-tight font-extrabold font-heading text-white tracking-tight">
            What are we making today?
          </h2>
          <p className="mt-3 text-base sm:text-lg text-indigo-100">Describe a post and we’ll design it. Or pick a style below.</p>
          <form onSubmit={submit} className="mx-auto mt-8 max-w-[680px] flex flex-col sm:flex-row gap-2 rounded-2xl bg-white p-2 shadow-xl">
            <label htmlFor="designer-prompt" className="sr-only">
              Describe your post
            </label>
            <div className="flex flex-1 items-center gap-3 px-3">
              <Icon icon="lucide:sparkles" className="w-5 h-5 text-primary shrink-0" aria-hidden />
              <input
                id="designer-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. A bold quote about consistency for my fitness page"
                className="w-full h-12 bg-transparent text-[15px] text-[#0B1C30] placeholder:text-[#777587] focus:outline-none"
              />
            </div>
            <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 h-12 text-sm font-semibold text-white hover:bg-primary-700">
              Design it
              <Icon icon="lucide:arrow-right" className="w-4 h-4" aria-hidden />
            </button>
          </form>
          <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Format">
            {FORMAT_IDS.map((id) => (
              <Chip key={id} tone="dark" selected={format === id} onClick={() => setFormat(id)}>
                {FORMATS[id].label}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="styles-title" className="space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 id="styles-title" className="text-xl font-bold font-heading text-[#0B1C30]">
            Start from a style
          </h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter styles">
            {FILTERS.map((f) => (
              <Chip key={f.id} selected={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </Chip>
            ))}
          </div>
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {styles.map((style) => (
            <StyleCard key={style.id} style={style} busy={starting === style.id} disabled={!!starting} onUse={() => startFromStyle(style)} />
          ))}
          {aiCards.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/designer/new?source=${c.id}&format=${format}`}
              className={`${CARD} p-3 flex flex-col group transition-transform hover:-translate-y-0.5 hover:shadow-lg`}
            >
              <div className={`relative aspect-[4/5] rounded-xl bg-gradient-to-br ${c.gradient} flex flex-col items-center justify-center gap-3 text-center px-4 overflow-hidden`}>
                <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-white/20 blur-2xl" />
                <Icon icon={c.icon} className="relative w-10 h-10 text-white" aria-hidden />
                <p className="relative text-sm font-semibold text-white">{c.description}</p>
                <span className="relative mt-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-[#0B1C30]">
                  Make one <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" aria-hidden />
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-3 px-1">
                <span className="font-bold text-[#0B1C30] text-sm">{c.name}</span>
                <CostBadge cost={c.cost} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="mine-title" className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 id="mine-title" className="text-xl font-bold font-heading text-[#0B1C30]">
            My designs
          </h2>
          {!!designs?.length && (
            <Link href="/dashboard/designer/library" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              See all <Icon icon="lucide:chevron-right" className="w-4 h-4" aria-hidden />
            </Link>
          )}
        </div>
        {designs === null ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-white/70 animate-pulse" />
            ))}
          </div>
        ) : designs.length === 0 ? (
          <p className={`${CARD} p-6 text-sm text-[#464555]`}>Designs you make show up here.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {designs.slice(0, 5).map((d) => (
              <Link key={d.designId} href={designerPath(d.designId)} className={`${CARD} p-2.5 group hover:border-primary/40 transition-colors`}>
                <DesignThumb doc={d.doc} className="rounded-xl" />
                <p className="mt-2 px-1 text-sm font-bold text-[#0B1C30] truncate">{d.name}</p>
                <p className="px-1 text-xs text-[#777587]">
                  {FORMATS[d.doc.format].short} · {timeAgo(d.updatedAt)}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StyleCard({ style, busy, disabled, onUse }: { style: DesignStyle; busy: boolean; disabled: boolean; onUse: () => void }) {
  const doc = useMemo(() => style.build(style.example, 'portrait', paletteById(style.palette)), [style]);
  return (
    <div className={`${CARD} p-3 flex flex-col group transition-transform hover:-translate-y-0.5 hover:shadow-lg`}>
      <div className="relative overflow-hidden rounded-xl">
        <DesignCanvas doc={doc} resolution={0.5} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/35 group-hover:opacity-100 focus-within:bg-black/35 focus-within:opacity-100 transition">
          <button
            type="button"
            onClick={onUse}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 h-10 text-sm font-semibold text-[#0B1C30] shadow disabled:opacity-60"
          >
            {busy ? <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" aria-hidden /> : null}
            Use this style
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 pt-3 px-1">
        <div className="min-w-0">
          <p className="font-bold text-[#0B1C30] text-sm truncate">{style.name}</p>
          <p className="text-xs text-[#777587] truncate">{style.description}</p>
        </div>
        <CostBadge cost="free" />
      </div>
    </div>
  );
}
