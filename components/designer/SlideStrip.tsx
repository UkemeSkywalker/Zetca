'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import type { DesignDoc } from '@/lib/design/types';
import { isContentSlide, MAX_SLIDES, MIN_SLIDES } from '@/lib/design/carousel';
import { DesignThumb } from './DesignCanvas';

/**
 * A carousel's slides under the canvas: pick one to edit, add a point,
 * move or remove the one picked. The cover stays first and the closing
 * slide last.
 */
export function SlideStrip({
  slides,
  current,
  onPick,
  onAdd,
  onRemove,
  onMove,
}: {
  slides: DesignDoc[];
  current: number;
  onPick: (i: number) => void;
  onAdd: () => void;
  onRemove: () => void;
  onMove: (by: -1 | 1) => void;
}) {
  const label = (i: number) => (i === 0 ? 'Cover' : i === slides.length - 1 ? 'Closing' : `Slide ${i + 1}`);
  const movable = isContentSlide(slides, current);
  return (
    <section aria-label="Carousel slides" className="rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#777587]">Carousel slides</p>
        <span className="text-xs text-[#64748B]">{slides.length} slides total</span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => onMove(-1)} disabled={!movable || !isContentSlide(slides, current - 1)} aria-label="Move slide left" className="rounded-lg p-1.5 text-[#464555] hover:bg-[#F1F5F9] disabled:opacity-30">
            <Icon icon="lucide:arrow-left" className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={!movable || !isContentSlide(slides, current + 1)} aria-label="Move slide right" className="rounded-lg p-1.5 text-[#464555] hover:bg-[#F1F5F9] disabled:opacity-30">
            <Icon icon="lucide:arrow-right" className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={!movable || slides.length <= MIN_SLIDES}
            aria-label="Remove this slide"
            title={slides.length <= MIN_SLIDES ? 'A carousel needs a cover, at least one point and a closing slide' : 'Remove this slide'}
            className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
          >
            <Icon icon="lucide:trash-2" className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" role="listbox" aria-label="Slides" aria-orientation="horizontal">
        {slides.map((s, i) => {
          const last = i === slides.length - 1;
          return (
            <React.Fragment key={i}>
              {last && (
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={slides.length >= MAX_SLIDES}
                  title={slides.length >= MAX_SLIDES ? `Up to ${MAX_SLIDES} slides` : 'Add a slide'}
                  className="flex w-[76px] shrink-0 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[#CBD5E1] text-xs font-semibold text-[#64748B] hover:border-primary/50 hover:text-primary disabled:opacity-40"
                >
                  <Icon icon="lucide:plus" className="h-5 w-5" aria-hidden />
                  Add
                </button>
              )}
              <button
                type="button"
                role="option"
                aria-selected={i === current}
                onClick={() => onPick(i)}
                className="w-[76px] shrink-0 text-center"
              >
                <span className={`block overflow-hidden rounded-xl border-2 ${i === current ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}>
                  <DesignThumb doc={s} frame="portrait" resolution={0.1} />
                </span>
                <span className={`mt-1 block truncate text-[11px] font-semibold ${i === current ? 'text-primary' : 'text-[#64748B]'}`}>{label(i)}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}
