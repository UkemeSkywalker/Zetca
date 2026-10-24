'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { DesignDoc, DesignRecord, TextLayer } from '@/lib/design/types';
import { PALETTES, STYLES, restyle, textOf, type Palette } from '@/lib/design/styles';
import { lowContrastLayers, updateLayer } from '@/lib/design/edit';
import { readableOverlay } from '@/lib/design/photo';
import { designerPath } from '@/lib/api/designApi';
import { DesignCanvas, DesignThumb } from '@/components/designer/DesignCanvas';
import { CostBadge } from '@/components/designer/ui';
import { MAKEABLE, VISUAL_LABELS, updatePostVisual } from '@/components/designer/postVisuals';
import type { CopyRecord, VisualKind } from '@/types/agent';
import { platformInfo } from './platforms';
import { VISUAL_REQUIRED, visualOf } from './usePostVisuals';

const COSTS: Record<VisualKind, 'free' | number | 'soon'> = {
  none: 'free',
  template: 'free',
  stock: 'free',
  ai_image: 'soon',
  ai_video: 'soon',
};
const KINDS: VisualKind[] = ['none', 'template', 'stock', 'ai_image', 'ai_video'];

/** The visual row at the bottom of a post card */
export function VisualRow({
  copy,
  design,
  making,
  error,
  onChoose,
  onCreate,
  onEdit,
  size = 'sm',
}: {
  copy: CopyRecord;
  design?: DesignRecord;
  making: boolean;
  error?: string;
  onChoose: (kind: VisualKind) => void;
  onCreate: () => void;
  onEdit: () => void;
  /** "lg": the bigger version in the copy editor */
  size?: 'sm' | 'lg';
}) {
  const kind = visualOf(copy).kind;
  const required = VISUAL_REQUIRED.has(copy.platform);
  const ready = !!copy.visual?.mediaId;
  const status = making
    ? kind === 'ai_video'
      ? 'Making the AI video… about 2 minutes'
      : kind === 'ai_image'
        ? 'Making the AI image… under a minute'
        : 'Creating…'
    : error
      ? error
      : kind === 'none'
        ? 'Text-only post'
        : ready
          ? 'Ready to schedule'
          : MAKEABLE.includes(kind)
            ? 'Not made yet'
            : 'Coming soon';

  return (
    <div className={`relative z-10 flex items-start gap-3 ${size === 'lg' ? 'rounded-2xl bg-[#f8f9ff] border border-[#e5eeff] p-3' : 'pt-3 border-t border-[#e5eeff]'}`}>
      <button
        type="button"
        onClick={ready && design ? onEdit : undefined}
        disabled={!ready || !design}
        aria-label={ready && design ? 'Edit the visual' : 'No visual yet'}
        className={`group/thumb relative shrink-0 rounded-lg overflow-hidden ${size === 'lg' ? 'w-24 h-24' : 'w-14 h-14'}`}
      >
        {making ? (
          <span className="flex w-full h-full items-center justify-center rounded-lg border-2 border-dashed border-[#c7c4d8] bg-[#f8f9ff]">
            <Icon icon="material-symbols:progress-activity" width={20} height={20} className="animate-spin text-[#4f46e5]" />
          </span>
        ) : ready && design ? (
          <>
            <DesignThumb doc={design.doc} frame="square" resolution={size === 'lg' ? 0.2 : 0.12} className="rounded-lg" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover/thumb:bg-black/40 group-hover/thumb:opacity-100 transition">
              <Icon icon="material-symbols:edit-outline" width={18} height={18} className="text-white" />
            </span>
          </>
        ) : (
          <span className="flex w-full h-full items-center justify-center rounded-lg border-2 border-dashed border-[#c7c4d8] bg-[#f8f9ff] text-[#94a3b8]">
            <Icon icon={kind === 'none' ? 'material-symbols:hide-image-outline' : 'material-symbols:image-outline'} width={20} height={20} />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-[#0b1c30]">
            <span className="truncate">{VISUAL_LABELS[kind]}</span>
            {kind !== 'none' && <CostBadge cost={COSTS[kind]} />}
          </p>
          <p className={`text-[11px] leading-[14px] line-clamp-2 ${error ? 'text-[#ba1a1a]' : 'text-[#777587]'}`} role={error ? 'alert' : undefined}>
            {required && kind !== 'none' && !ready && !making ? 'Visual required · ' : ''}
            {status}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <label className="sr-only" htmlFor={`visual-${copy.id}`}>
            Visual for this post
          </label>
          <select
            id={`visual-${copy.id}`}
            value={kind}
            disabled={making}
            onChange={(e) => onChoose(e.target.value as VisualKind)}
            className="min-w-0 flex-1 h-8 pl-2 pr-6 rounded-lg border border-[#c7c4d8]/60 bg-white text-[12px] font-semibold text-[#0b1c30] disabled:opacity-50"
          >
            {KINDS.map((k) => (
              <option key={k} value={k} disabled={(k === 'none' && required) || COSTS[k] === 'soon'}>
                {VISUAL_LABELS[k]}
                {k === 'none' && required
                  ? ` (${platformInfo(copy.platform).label} needs a visual)`
                  : COSTS[k] === 'soon'
                    ? ' (soon)'
                    : k !== 'none'
                      ? ' · Free'
                      : ''}
              </option>
            ))}
          </select>
          {MAKEABLE.includes(kind) && !ready && !making ? (
            <button
              type="button"
              onClick={onCreate}
              className="shrink-0 h-8 px-3 rounded-lg bg-[#4f46e5] text-white text-[12px] font-semibold hover:bg-[#4338ca]"
            >
              Create
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** "7 posts need a visual · Create all visuals" */
export function VisualsBanner({ count, busy, onCreateAll, aiCredits = 0 }: { count: number; busy: boolean; onCreateAll: () => void; aiCredits?: number }) {
  if (count === 0 && !busy) return null;
  return (
    <div className="mb-4 rounded-2xl bg-[#eef2ff] border border-[#c7d2fe] px-4 py-3 flex flex-wrap items-center gap-3">
      <span className="w-9 h-9 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shrink-0">
        <Icon icon="material-symbols:image-outline" width={18} height={18} />
      </span>
      <p className="flex-1 min-w-[180px] text-[14px] text-[#0b1c30]">
        <span className="font-bold">{busy ? 'Creating visuals…' : `${count} ${count === 1 ? 'post needs' : 'posts need'} a visual`}</span>
        <span className="text-[#464555]"> · {aiCredits ? `Uses ${aiCredits} AI ${aiCredits === 1 ? 'credit' : 'credits'}` : 'Free: text designs and stock photos'}</span>
      </p>
      <button
        type="button"
        onClick={onCreateAll}
        disabled={busy || count === 0}
        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#4f46e5] text-white text-[13px] font-semibold hover:bg-[#4338ca] disabled:opacity-60"
      >
        {busy ? (
          <Icon icon="material-symbols:progress-activity" width={15} height={15} className="animate-spin" />
        ) : (
          <Icon icon="material-symbols:auto-awesome-outline" width={15} height={15} />
        )}
        <span className="text-inherit">{busy ? 'Creating…' : 'Create all visuals'}</span>
      </button>
    </div>
  );
}

function paletteOf(doc: DesignDoc): Palette {
  const bg = doc.background.kind === 'solid' ? doc.background.color : '';
  return PALETTES.find((p) => p.background.toLowerCase() === bg.toLowerCase()) ?? PALETTES[0];
}

/** Quick edits to a post's visual, without leaving the Copywriter */
export function EditVisualModal({
  caption,
  platform: platformId,
  design,
  onClose,
  onSaved,
  onChoose,
}: {
  /** The post's text, shown beside the visual */
  caption: string;
  platform: string;
  design: DesignRecord;
  onClose: () => void;
  /** After saving: the design, its new image, and the Copywriter post if it has one */
  onSaved: (result: { copy: CopyRecord | null; design: DesignRecord; image: { mediaId: string; mediaType: 'image' | 'video'; blob: Blob } }) => void;
  /** Switching between a text design and a stock photo makes a new visual; left out, the choice isn't offered */
  onChoose?: (kind: VisualKind) => void;
}) {
  const [doc, setDoc] = useState<DesignDoc>(design.doc);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const platform = platformInfo(platformId);
  const isPhoto = doc.background.kind === 'photo';
  const headline = doc.layers.find((l) => l.role === 'headline');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const styleChoices = useMemo(() => STYLES.filter((s) => !!s.usesPhoto === isPhoto).slice(0, 6), [isPhoto]);
  const previews = useMemo(
    () =>
      styleChoices.map((s) => ({
        id: s.id,
        name: s.name,
        doc: restyle(doc, s.id, paletteOf(doc)),
      })),
    [styleChoices, doc],
  );

  const setHeadline = (text: string) => headline && setDoc((d) => readableOverlay(updateLayer(d, headline.id, { text } as Partial<TextLayer>)));
  const low = lowContrastLayers(doc);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const r = await updatePostVisual(design, doc, textOf(doc).headline.replace(/\n/g, ' ').slice(0, 60) || design.name);
      onSaved({
        copy: r.copy,
        design: r.design,
        image: { mediaId: r.image.mediaId, mediaType: r.image.mediaType, blob: r.image.blob },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the visual');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0b1c30]/50 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-visual-title"
        className="w-full max-w-[880px] max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div className="grid md:grid-cols-[1fr_1.1fr]">
          <div className="p-6 bg-[#f8f9ff] md:rounded-l-3xl space-y-4">
            <div className="rounded-2xl bg-white border border-[#e5eeff] p-4">
              <p className="text-[11px] font-bold tracking-[0.08em] text-[#777587] uppercase">Caption preview</p>
              <p className="mt-1.5 text-[13px] leading-[20px] text-[#0b1c30] line-clamp-4 whitespace-pre-line">{caption}</p>
            </div>
            <div className="mx-auto max-w-[320px] rounded-2xl overflow-hidden shadow-lg">
              <DesignCanvas doc={doc} resolution={0.5} />
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${platform.badge}`}>
                <Icon icon={platform.icon} width={16} height={16} />
              </span>
              <h2 id="edit-visual-title" className="text-[20px] font-bold text-[#0b1c30]">
                Edit visual
              </h2>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                aria-label="Close"
                className="ml-auto w-9 h-9 rounded-lg flex items-center justify-center text-[#464555] hover:bg-[#eff4ff]"
              >
                <Icon icon="material-symbols:close" width={20} height={20} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-bold tracking-[0.08em] text-[#777587] uppercase">Style</p>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {previews.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.name}
                    aria-pressed={doc.styleId === p.id}
                    onClick={() => setDoc(p.doc)}
                    className={`rounded-lg overflow-hidden border-2 ${doc.styleId === p.id ? 'border-[#4f46e5]' : 'border-transparent hover:border-[#4f46e5]/40'}`}
                  >
                    <DesignThumb doc={p.doc} frame="portrait" resolution={0.1} />
                  </button>
                ))}
              </div>
            </div>

            {headline && (
              <div className="space-y-2">
                <label htmlFor="visual-text" className="text-[11px] font-bold tracking-[0.08em] text-[#777587] uppercase">
                  Text
                </label>
                <textarea
                  id="visual-text"
                  rows={2}
                  value={headline.text}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] px-3.5 py-2.5 text-[14px] font-semibold text-[#0b1c30] resize-none focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20"
                />
              </div>
            )}

            {!isPhoto && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold tracking-[0.08em] text-[#777587] uppercase">Colour</p>
                <div className="flex flex-wrap items-center gap-2">
                  {PALETTES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      aria-label={`${p.name} colours`}
                      aria-pressed={paletteOf(doc).id === p.id}
                      onClick={() => setDoc((d) => restyle(d, d.styleId, p))}
                      className={`w-8 h-8 rounded-full border-2 ${paletteOf(doc).id === p.id ? 'border-[#4f46e5] ring-2 ring-[#4f46e5]/25' : 'border-[#e2e8f0]'}`}
                      style={{ background: p.background }}
                    />
                  ))}
                  {low.length === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      <Icon icon="material-symbols:check" width={13} height={13} /> High contrast
                    </span>
                  )}
                </div>
              </div>
            )}

            {onChoose && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold tracking-[0.08em] text-[#777587] uppercase">Source</p>
                <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#eff4ff] p-1">
                  {(['template', 'stock', 'ai_image'] as VisualKind[]).map((k) => {
                    const active = (doc.video ? 'ai_video' : !isPhoto ? 'template' : doc.background.kind === 'photo' && doc.background.credit.source === 'ai' ? 'ai_image' : 'stock') === k;
                    const soon = !MAKEABLE.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        disabled={soon || saving}
                        aria-pressed={active}
                        onClick={() => !active && onChoose(k)}
                        className={`h-9 rounded-lg text-[12px] font-semibold ${active ? 'bg-white text-[#0b1c30] shadow-sm' : 'text-[#464555] hover:bg-white/60'} disabled:opacity-50`}
                      >
                        {k === 'template' ? 'Text design' : k === 'stock' ? 'Stock photo' : 'AI image'} · {soon ? 'Soon' : k === 'ai_image' ? '1 credit' : 'Free'}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#777587]">Changing the source makes a new visual.</p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-[13px] font-medium text-[#ba1a1a]">
                {error}
              </p>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#e5eeff]">
              <Link
                href={designerPath(design.designId)}
                className="inline-flex items-center gap-1.5 pt-3 text-[13px] font-semibold text-[#4f46e5] hover:underline"
              >
                <Icon icon="material-symbols:open-in-new" width={15} height={15} /> Open in Designer
              </Link>
              <div className="ml-auto flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="h-10 px-4 rounded-xl border border-[#c7c4d8]/60 text-[13px] font-semibold text-[#0b1c30] hover:bg-[#eff4ff]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-xl bg-[#4f46e5] text-white text-[13px] font-semibold hover:bg-[#4338ca] disabled:opacity-70"
                >
                  {saving ? (
                    <Icon icon="material-symbols:progress-activity" width={15} height={15} className="animate-spin" />
                  ) : (
                    <Icon icon="material-symbols:check" width={15} height={15} />
                  )}
                  <span className="text-inherit">{saving ? 'Saving…' : 'Save visual'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
