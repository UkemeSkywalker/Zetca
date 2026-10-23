'use client';

/**
 * Designs a YouTube thumbnail from the video's title: 4 options as a text
 * design or a stock photo with text, saved at 1280 × 720.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import type { DesignDoc } from '@/lib/design/types';
import type { VisualKind } from '@/types/agent';
import { designToBlob } from '@/lib/design/render';
import { createDesign } from '@/lib/api/designApi';
import { DesignCanvas } from './DesignCanvas';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { photosFor } from './photos';
import { designOptions, savePreviewPhoto } from './postVisuals';
import { CostBadge } from './ui';

/** YouTube takes thumbnails up to 2 MB */
const MAX_BYTES = 2 * 1024 * 1024;

export function ThumbnailDesigner({
  title,
  description,
  onClose,
  onPick,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  /** The finished 1280 × 720 image */
  onPick: (image: Blob) => void;
}) {
  const [kind, setKind] = useState<VisualKind>('template');
  const [options, setOptions] = useState<DesignDoc[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [using, setUsing] = useState<number | null>(null);
  const [error, setError] = useState('');

  const make = useCallback(
    async (k: VisualKind) => {
      setBusy(true);
      setError('');
      try {
        // AI makes one image per credit; the free options show 4
        const r = await designOptions(
          { id: `${title}-${k}-${Date.now()}`, text: `YouTube video: ${title}${description ? `\n\n${description.slice(0, 400)}` : ''}`, platform: 'youtube' },
          k,
          k === 'ai_image' ? 1 : 4,
          'landscape'
        );
        setOptions(r.docs);
        setName(r.name);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Couldn’t design thumbnails');
      } finally {
        setBusy(false);
      }
    },
    [title, description]
  );

  useEffect(() => {
    void make('template');
  }, [make]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && using === null && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, using]);

  const use = async (doc: DesignDoc, i: number) => {
    setUsing(i);
    setError('');
    try {
      const ready = await savePreviewPhoto(doc);
      await loadDesignFonts();
      const blob = await designToBlob(ready, FONT_FAMILIES, await photosFor(ready));
      if (blob.size > MAX_BYTES) throw new Error('That thumbnail came out over 2 MB. Try another one.');
      // Keep it in My designs too, so it can be changed later
      await createDesign({ name: name || 'YouTube thumbnail', source: ready.background.kind === 'photo' ? 'stock' : 'template', doc: ready }).catch(() => undefined);
      onPick(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t use that thumbnail');
      setUsing(null);
    }
  };

  const pickKind = (k: VisualKind) => {
    if (k === kind || busy) return;
    setKind(k);
    void make(k);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && using === null && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="thumb-title" className="w-full max-w-[860px] max-h-[92vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-5">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#FF0000]/10 text-[#FF0000] flex items-center justify-center shrink-0">
            <Icon icon="simple-icons:youtube" className="w-5 h-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="thumb-title" className="text-xl font-bold text-[#0B1C30]">
              Design a thumbnail
            </h2>
            <p className="text-sm text-[#464555] truncate">From “{title}”</p>
          </div>
          <button type="button" onClick={onClose} disabled={using !== null} aria-label="Close" className="ml-auto p-2 rounded-lg text-[#464555] hover:bg-[#F1F5F9]">
            <Icon icon="lucide:x" className="w-5 h-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Make it with">
          {(['template', 'stock', 'ai_image'] as VisualKind[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => pickKind(k)}
              disabled={busy}
              className={`inline-flex items-center gap-2 rounded-full border px-4 h-9 text-sm font-semibold ${
                kind === k ? 'border-primary bg-primary text-white' : 'border-[#E2E8F0] bg-white text-[#464555] hover:border-primary/40'
              }`}
            >
              <Icon icon={k === 'template' ? 'lucide:type' : k === 'stock' ? 'lucide:image' : 'lucide:sparkles'} className="w-4 h-4" aria-hidden />
              {k === 'template' ? 'Text design' : k === 'stock' ? 'Stock photo' : 'AI image'}
              <CostBadge cost={k === 'ai_image' ? 2 : 1} />
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy={busy}>
          {busy || !options.length
            ? (kind === 'ai_image' ? [0] : [0, 1, 2, 3]).map((i) => (
                <div key={i} className="aspect-video rounded-2xl bg-[#F1F5F9] animate-pulse flex items-center justify-center">
                  {kind === 'ai_image' && busy && <span className="text-sm font-semibold text-[#64748B]">Making your AI image… under a minute</span>}
                </div>
              ))
            : options.map((doc, i) => (
                <div key={i} className="group relative overflow-hidden rounded-2xl shadow-sm">
                  <DesignCanvas doc={doc} resolution={0.5} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/35 group-hover:opacity-100 focus-within:bg-black/35 focus-within:opacity-100 transition">
                    <button
                      type="button"
                      onClick={() => use(doc, i)}
                      disabled={using !== null}
                      className="inline-flex items-center gap-2 rounded-xl bg-white px-4 h-10 text-sm font-semibold text-[#0B1C30] shadow"
                    >
                      {using === i ? <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" aria-hidden /> : <Icon icon="lucide:check" className="w-4 h-4" aria-hidden />}
                      Use this thumbnail
                    </button>
                  </div>
                </div>
              ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#777587]">
            1280 × 720. Saved to My designs, so you can change it later.{kind === 'stock' ? ' Free photos from Pixabay.' : ''}
          </p>
          <button
            type="button"
            onClick={() => make(kind)}
            disabled={busy || using !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 h-10 text-sm font-semibold text-[#0B1C30] hover:border-primary/40 disabled:opacity-50"
          >
            <Icon icon="lucide:refresh-cw" className="w-4 h-4" aria-hidden /> {kind === 'ai_image' ? 'Make another (1 credit)' : 'Try 4 more'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
