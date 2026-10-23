'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { PALETTES, STYLES, restyle, type Palette } from '@/lib/design/styles';
import { backgroundColors, type Background, type DesignDoc, type TextLayer } from '@/lib/design/types';
import { worstContrast, bestTextColor } from '@/lib/design/contrast';
import { addText, fixContrast, lowContrastLayers, setBackground, setHandle, setOverlay, setPhotoBackground, updateLayer, type NewTextKind } from '@/lib/design/edit';
import { photoCredit, readableOverlay } from '@/lib/design/photo';
import { textOf } from '@/lib/design/styles';
import { FORMATS, type PhotoBackground } from '@/lib/design/types';
import { DesignRequestError, savePhoto, searchPhotos, type StockPhoto } from '@/lib/api/designApi';
import { loadPhoto, rememberSaved, tonesOf } from './photos';
import { rememberHandle, rememberedHandle } from '@/lib/api/designApi';
import { DesignCanvas } from './DesignCanvas';
import { FONT_FAMILIES, FONT_OPTIONS } from './fonts';
import { ContrastBadge, INPUT } from './ui';

export type Tab = 'styles' | 'text' | 'background' | 'photos' | 'brand';

type Change = (next: (d: DesignDoc) => DesignDoc, opts?: { coalesce?: boolean }) => void;

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'styles', label: 'Styles', icon: 'lucide:layout-template' },
  { id: 'text', label: 'Text', icon: 'lucide:type' },
  { id: 'background', label: 'Background', icon: 'lucide:paint-bucket' },
  { id: 'photos', label: 'Photos', icon: 'lucide:image' },
  { id: 'brand', label: 'Brand', icon: 'lucide:badge-check' },
];

const PANEL = 'rounded-2xl bg-white border border-[#E2E8F0]';
const HEADING = 'text-xs font-bold uppercase tracking-wider text-[#777587]';

const TEXT_COLORS = ['#FFFFFF', '#0B0B0F', '#FACC15', '#15803D', '#DC2626', '#0B1C30', '#4F46E5', '#FFF7E6'];
const EXTRA_BACKGROUNDS = ['#FFFFFF', '#0EA5E9', '#7C3AED', '#BE185D'];
const GRADIENTS: { from: string; to: string }[] = [
  { from: '#312E81', to: '#7C3AED' },
  { from: '#0B1C30', to: '#1D4ED8' },
  { from: '#7F1D1D', to: '#DC2626' },
  { from: '#14532D', to: '#16A34A' },
  { from: '#FDE68A', to: '#F97316' },
  { from: '#FFF7E6', to: '#FBCFE8' },
];

/** The palette a design looks closest to (by background colour) */
function currentPalette(doc: DesignDoc): Palette {
  const bg = doc.background.kind === 'solid' ? doc.background.color : doc.background.kind === 'gradient' ? doc.background.to : '';
  return PALETTES.find((p) => p.background.toLowerCase() === bg.toLowerCase()) ?? PALETTES[0];
}

export function LeftPanel({
  tab,
  onTab,
  doc,
  onChange,
  onSelect,
  selected,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  doc: DesignDoc;
  onChange: Change;
  onSelect: (id: string | null) => void;
  selected: string | null;
}) {
  return (
    <div className={`${PANEL} flex min-h-0 overflow-hidden`}>
      <div role="tablist" aria-label="Editor tools" aria-orientation="vertical" className="flex lg:flex-col gap-1 p-2 border-r border-[#E2E8F0] bg-[#F8F9FF]">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={tab === t.id}
            onClick={() => onTab(t.id)}
            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 w-[64px] text-[11px] font-semibold ${tab === t.id ? 'bg-white text-primary shadow-sm' : 'text-[#64748B] hover:bg-white/70'}`}
          >
            <Icon icon={t.icon} className="w-5 h-5" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex-1 min-w-0 overflow-y-auto p-4 space-y-5">
        {tab === 'styles' && <StylesTab doc={doc} onChange={onChange} />}
        {tab === 'text' && <TextTab doc={doc} onChange={onChange} onSelect={onSelect} selected={selected} />}
        {tab === 'background' && <BackgroundTab doc={doc} onChange={onChange} />}
        {tab === 'photos' && <PhotosTab doc={doc} onChange={onChange} />}
        {tab === 'brand' && <BrandTab doc={doc} onChange={onChange} />}
      </div>
    </div>
  );
}

function StylesTab({ doc, onChange }: { doc: DesignDoc; onChange: Change }) {
  const palette = currentPalette(doc);
  const previews = useMemo(() => STYLES.map((s) => ({ style: s, doc: restyle(doc, s.id, palette) })), [doc, palette]);
  return (
    <>
      <div className="space-y-2">
        <p className={HEADING}>Colours</p>
        <div className="flex flex-wrap gap-2">
          {PALETTES.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-label={`${p.name} colours`}
              aria-pressed={p.id === palette.id}
              onClick={() => onChange((d) => restyle(d, d.styleId, p))}
              className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-[13px] font-black ${p.id === palette.id ? 'border-primary ring-2 ring-primary/30' : 'border-[#E2E8F0]'}`}
              style={{ background: p.background, color: p.text }}
            >
              A
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <p className={HEADING}>Styles</p>
        <p className="text-xs text-[#777587]">Switching style keeps your words.</p>
        <div className="grid grid-cols-2 gap-2">
          {previews.map(({ style, doc: preview }) => (
            <button
              key={style.id}
              type="button"
              aria-pressed={doc.styleId === style.id}
              onClick={() => onChange((d) => restyle(d, style.id, currentPalette(d)))}
              className={`rounded-xl overflow-hidden border-2 text-left ${doc.styleId === style.id ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
            >
              <DesignCanvas doc={preview} resolution={0.25} />
              <span className="block px-1.5 py-1 text-[11px] font-semibold text-[#0B1C30] truncate">{style.name}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function TextTab({ doc, onChange, onSelect, selected }: { doc: DesignDoc; onChange: Change; onSelect: (id: string | null) => void; selected: string | null }) {
  const add = (kind: NewTextKind) => {
    let id = '';
    onChange((d) => {
      const r = addText(d, kind);
      id = r.id;
      return r.doc;
    });
    setTimeout(() => id && onSelect(id));
  };
  return (
    <>
      <div className="space-y-2">
        <button type="button" onClick={() => add('heading')} className="w-full rounded-xl bg-[#F1F5F9] hover:bg-[#E8EDF5] px-4 py-3 text-left text-2xl font-extrabold text-[#0B1C30]">
          Add heading
        </button>
        <button type="button" onClick={() => add('subheading')} className="w-full rounded-xl bg-[#F1F5F9] hover:bg-[#E8EDF5] px-4 py-2.5 text-left text-lg font-bold text-[#0B1C30]">
          Add subheading
        </button>
        <button type="button" onClick={() => add('small')} className="w-full rounded-xl bg-[#F1F5F9] hover:bg-[#E8EDF5] px-4 py-2 text-left text-sm text-[#464555]">
          Add a little text
        </button>
      </div>
      <div className="space-y-2">
        <p className={HEADING}>On this design</p>
        {doc.layers.length === 0 && <p className="text-sm text-[#777587]">No text yet.</p>}
        {doc.layers.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => onSelect(l.id)}
            className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-left ${selected === l.id ? 'border-primary bg-primary-50/50' : 'border-[#E2E8F0] hover:border-primary/40'}`}
          >
            <Icon icon="lucide:type" className="w-4 h-4 text-[#777587] shrink-0" aria-hidden />
            <span className="truncate text-sm text-[#0B1C30]" style={{ fontFamily: FONT_FAMILIES[l.font] }}>
              {l.text.replace(/\n/g, ' ') || 'Empty text'}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function BackgroundTab({ doc, onChange }: { doc: DesignDoc; onChange: Change }) {
  const set = (bg: Background) => onChange((d) => setBackground(d, bg));
  const bg = doc.background;
  const solid = bg.kind === 'solid' ? bg.color : null;
  return (
    <>
      <div className="space-y-2">
        <p className={HEADING}>Colour</p>
        <div className="grid grid-cols-6 gap-2">
          {[...PALETTES.map((p) => p.background), ...EXTRA_BACKGROUNDS].map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Background ${c}`}
              aria-pressed={solid?.toLowerCase() === c.toLowerCase()}
              onClick={() => set({ kind: 'solid', color: c })}
              className={`aspect-square rounded-lg border-2 ${solid?.toLowerCase() === c.toLowerCase() ? 'border-primary ring-2 ring-primary/30' : 'border-[#E2E8F0]'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-[#464555]">
          <input type="color" value={solid ?? '#000000'} onChange={(e) => set({ kind: 'solid', color: e.target.value.toUpperCase() })} className="h-8 w-10 rounded border border-[#E2E8F0]" />
          Pick any colour
        </label>
      </div>
      <div className="space-y-2">
        <p className={HEADING}>Gradient</p>
        <div className="grid grid-cols-3 gap-2">
          {GRADIENTS.map((g) => {
            const active = bg.kind === 'gradient' && bg.from === g.from && bg.to === g.to;
            return (
              <button
                key={`${g.from}${g.to}`}
                type="button"
                aria-label={`Gradient ${g.from} to ${g.to}`}
                aria-pressed={active}
                onClick={() => set({ kind: 'gradient', from: g.from, to: g.to, angle: 160 })}
                className={`aspect-[4/3] rounded-lg border-2 ${active ? 'border-primary ring-2 ring-primary/30' : 'border-[#E2E8F0]'}`}
                style={{ background: `linear-gradient(160deg, ${g.from}, ${g.to})` }}
              />
            );
          })}
        </div>
      </div>
      <p className="text-xs text-[#777587]">Text colours change by themselves if they’d be hard to read.</p>
    </>
  );
}

/** Words worth searching for, from the design's headline */
function suggestedQuery(doc: DesignDoc): string {
  const words = textOf(doc).headline.toLowerCase().replace(/[^\p{L}\s]/gu, ' ').split(/\s+/);
  const stop = new Set(['the', 'and', 'for', 'your', 'with', 'you', 'our', 'are', 'this', 'that', 'from', 'every', 'even', 'new', 'not']);
  return words.filter((w) => w.length > 2 && !stop.has(w)).slice(0, 2).join(' ');
}

function PhotosTab({ doc, onChange }: { doc: DesignDoc; onChange: Change }) {
  const [query, setQuery] = useState(() => suggestedQuery(doc) || 'fitness');
  const [searched, setSearched] = useState('');
  const [results, setResults] = useState<StockPhoto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<number | null>(null);
  const [error, setError] = useState('');
  const orientation = doc.format === 'square' ? 'all' : 'vertical';

  const run = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchPhotos(q, orientation));
      setSearched(q);
    } catch (err) {
      setError(err instanceof DesignRequestError ? err.message : 'Couldn’t search photos');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void run(query);
    // Search once when the tab opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = async (photo: StockPhoto) => {
    setPicking(photo.id);
    setError('');
    const previewId = `pixabay:${photo.id}`;
    try {
      // Show it straight away from the preview, then keep a copy in Zetca
      const img = await loadPhoto({ photoId: previewId, previewUrl: photo.previewUrl });
      const preview: PhotoBackground = {
        kind: 'photo',
        photoId: previewId,
        previewUrl: photo.previewUrl,
        width: img.width,
        height: img.height,
        focusX: 0.5,
        focusY: 0.5,
        fit: 'fill',
        tones: tonesOf(img),
        credit: { ...photo.credit, source: 'pixabay' },
      };
      onChange((d) => setPhotoBackground(d, preview));
      const saved = await savePhoto(photo.id);
      rememberSaved(previewId, { ...preview, photoId: saved.photoId, previewUrl: undefined });
      onChange(
        (d) =>
          d.background.kind === 'photo' && d.background.photoId === previewId
            ? { ...d, background: { ...d.background, photoId: saved.photoId, previewUrl: undefined } }
            : d,
        { coalesce: true }
      );
    } catch (err) {
      setError(err instanceof DesignRequestError ? err.message : 'Couldn’t use that photo. Try another one.');
    } finally {
      setPicking(null);
    }
  };

  const current = doc.background.kind === 'photo' ? doc.background.credit.url : null;

  return (
    <>
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
      >
        <div className="relative">
          <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777587]" aria-hidden />
          <input aria-label="Search free photos" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search photos" className={`${INPUT} pl-9 py-2.5`} />
        </div>
        <p className="text-xs text-[#777587]">
          Free photos from{' '}
          <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Pixabay
          </a>
        </p>
      </form>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {busy && !results ? (
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-[#F1F5F9] animate-pulse" />
          ))}
        </div>
      ) : results && results.length === 0 ? (
        <div className="py-8 text-center">
          <Icon icon="lucide:search-x" className="mx-auto w-8 h-8 text-[#94A3B8]" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-[#0B1C30]">No photos for “{searched}”</p>
          <p className="text-xs text-[#777587]">Try a shorter word.</p>
        </div>
      ) : (
        <div className={`grid grid-cols-2 gap-2 ${busy ? 'opacity-60' : ''}`} aria-busy={busy}>
          {(results ?? []).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              disabled={picking !== null}
              aria-label={`Use photo: ${p.tags}`}
              aria-pressed={current === p.credit.url}
              className={`relative overflow-hidden rounded-xl border-2 bg-[#F1F5F9] ${current === p.credit.url ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt="" loading="lazy" className="block w-full aspect-[3/4] object-cover" />
              {picking === p.id && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Icon icon="lucide:loader-circle" className="w-6 h-6 text-white animate-spin" aria-hidden />
                </span>
              )}
              {current === p.credit.url && (
                <span className="absolute top-1.5 right-1.5 rounded-full bg-primary p-0.5 text-white">
                  <Icon icon="lucide:check" className="w-3.5 h-3.5" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const OVERLAY_COLORS = ['#000000', '#FFFFFF', '#312E81'];

function PhotoControls({ doc, bg, onChange }: { doc: DesignDoc; bg: PhotoBackground; onChange: Change }) {
  const overlay = doc.overlay ?? { color: '#000000', opacity: 0 };
  const setBg = (patch: Partial<PhotoBackground>) => onChange((d) => (d.background.kind === 'photo' ? { ...d, background: { ...d.background, ...patch } } : d), { coalesce: true });
  const focusCells = [0.15, 0.5, 0.85];
  return (
    <div className="space-y-4 border-t border-[#E2E8F0] pt-4">
      <h3 className="text-base font-bold text-[#0B1C30]">Photo</h3>
      <div className="space-y-2">
        <p className={HEADING}>Overlay</p>
        <div className="flex items-center gap-2">
          {OVERLAY_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Overlay ${c}`}
              aria-pressed={overlay.color === c}
              onClick={() => onChange((d) => readableOverlay(setOverlay(d, { ...overlay, color: c })))}
              className={`h-8 w-8 rounded-full border-2 ${overlay.color === c ? 'border-primary ring-2 ring-primary/30' : 'border-[#E2E8F0]'}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <Slider label="Darkness" min={0} max={0.9} step={0.01} value={overlay.opacity} onChange={(v) => onChange((d) => setOverlay(d, { ...overlay, opacity: v }), { coalesce: true })} format={(v) => `${Math.round(v * 100)}%`} />
      </div>
      <div className="space-y-2">
        <p className={HEADING}>Fit</p>
        <div className="flex gap-2">
          {(['fill', 'fit'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={bg.fit === f}
              onClick={() => setBg({ fit: f })}
              className={`flex-1 h-9 rounded-full text-xs font-semibold ${bg.fit === f ? 'bg-primary text-white' : 'bg-[#F1F5F9] text-[#464555]'}`}
            >
              {f === 'fill' ? 'Fill' : 'Show all'}
            </button>
          ))}
        </div>
      </div>
      {bg.fit === 'fill' && (
        <div className="space-y-2">
          <p className={HEADING}>Keep in view</p>
          <div className="grid grid-cols-3 gap-1 w-24" role="group" aria-label="Part of the photo to keep in view">
            {focusCells.flatMap((fy) =>
              focusCells.map((fx) => {
                const on = Math.abs(bg.focusX - fx) < 0.2 && Math.abs(bg.focusY - fy) < 0.2;
                return (
                  <button
                    key={`${fx}-${fy}`}
                    type="button"
                    aria-label={`${fy < 0.3 ? 'Top' : fy > 0.7 ? 'Bottom' : 'Middle'} ${fx < 0.3 ? 'left' : fx > 0.7 ? 'right' : 'centre'}`}
                    aria-pressed={on}
                    onClick={() => setBg({ focusX: fx, focusY: fy })}
                    className={`aspect-square rounded-md border ${on ? 'bg-primary border-primary' : 'bg-[#F1F5F9] border-[#E2E8F0] hover:border-primary/40'}`}
                  />
                );
              })
            )}
          </div>
        </div>
      )}
      <p className="text-xs text-[#777587]">
        <a href={bg.credit.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {photoCredit(bg)}
        </a>
      </p>
    </div>
  );
}

function BrandTab({ doc, onChange }: { doc: DesignDoc; onChange: Change }) {
  const footer = doc.layers.find((l) => l.role === 'footer');
  const [handle, setHandleText] = useState(footer?.text ?? '');
  useEffect(() => {
    if (!footer && !handle) setHandleText(rememberedHandle());
    // Only when the tab opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="space-y-2">
      <label htmlFor="brand-handle" className={HEADING}>
        Your handle or name
      </label>
      <input
        id="brand-handle"
        value={handle}
        placeholder="@yourbrand"
        onChange={(e) => {
          setHandleText(e.target.value);
          onChange((d) => setHandle(d, e.target.value), { coalesce: true });
          rememberHandle(e.target.value);
        }}
        className={INPUT}
      />
      <p className="text-xs text-[#777587]">Shown at the bottom of the design. Zetca remembers it for your next designs on this device.</p>
    </div>
  );
}

export function RightPanel({ doc, layer, onChange }: { doc: DesignDoc; layer: TextLayer | null; onChange: Change }) {
  if (!layer) return <DesignSummary doc={doc} onChange={onChange} />;
  const set = (patch: Partial<TextLayer>, coalesce = false) => onChange((d) => updateLayer(d, layer.id, patch), { coalesce });
  const behind = layer.fill ? [layer.fill] : backgroundColors(doc);
  const ratio = worstContrast(layer.color, behind);
  return (
    <div className={`${PANEL} min-h-0 overflow-y-auto p-4 space-y-5`}>
      <h2 className="text-lg font-bold text-[#0B1C30]">Text</h2>
      <div>
        <label htmlFor="layer-text" className="sr-only">
          Text
        </label>
        <textarea id="layer-text" rows={3} value={layer.text} onChange={(e) => set({ text: e.target.value }, true)} className={`${INPUT} resize-none`} />
      </div>

      <div className="space-y-2">
        <label htmlFor="layer-font" className={HEADING}>
          Font
        </label>
        <select
          id="layer-font"
          value={layer.font}
          onChange={(e) => set({ font: e.target.value as TextLayer['font'] })}
          className="w-full h-11 rounded-xl border border-[#E2E8F0] bg-[#F8F9FF] px-3 text-base text-[#0B1C30]"
          style={{ fontFamily: FONT_FAMILIES[layer.font] }}
        >
          {FONT_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-[#F8F9FF]">
          <button type="button" aria-label="Smaller" onClick={() => set({ size: Math.max(12, layer.size - 8) }, true)} className="p-2.5 text-[#464555]">
            <Icon icon="lucide:minus" className="w-4 h-4" aria-hidden />
          </button>
          <span className="w-10 text-center text-sm font-semibold tabular-nums text-[#0B1C30]" aria-label="Largest size">
            {layer.size}
          </span>
          <button type="button" aria-label="Bigger" onClick={() => set({ size: Math.min(400, layer.size + 8) }, true)} className="p-2.5 text-[#464555]">
            <Icon icon="lucide:plus" className="w-4 h-4" aria-hidden />
          </button>
        </div>
        <button
          type="button"
          aria-pressed={layer.uppercase}
          onClick={() => set({ uppercase: !layer.uppercase })}
          className={`h-10 px-3 rounded-xl border text-sm font-bold ${layer.uppercase ? 'border-primary bg-primary text-white' : 'border-[#E2E8F0] text-[#464555]'}`}
        >
          AA
        </button>
      </div>
      <p className="-mt-3 text-[11px] text-[#777587]">Text shrinks to fit its box, so it’s never cut off.</p>

      {layer.font === 'jakarta' && (
        <div className="flex gap-2" role="group" aria-label="Weight">
          {([600, 700, 800] as const).map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={layer.weight === w}
              onClick={() => set({ weight: w })}
              className={`flex-1 h-9 rounded-full text-xs font-semibold ${layer.weight === w ? 'bg-primary text-white' : 'bg-[#F1F5F9] text-[#464555]'}`}
            >
              {w === 600 ? 'Medium' : w === 700 ? 'Bold' : 'Black'}
            </button>
          ))}
        </div>
      )}

      <Slider label="Line height" min={0.8} max={1.6} step={0.02} value={layer.lineHeight} onChange={(v) => set({ lineHeight: v }, true)} format={(v) => v.toFixed(2)} />
      <Slider label="Letter spacing" min={-0.05} max={0.3} step={0.01} value={layer.letterSpacing} onChange={(v) => set({ letterSpacing: v }, true)} format={(v) => v.toFixed(2)} />

      <div className="space-y-2">
        <p className={HEADING}>Text colour</p>
        <div className="flex flex-wrap gap-2">
          {TEXT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Text colour ${c}`}
              aria-pressed={layer.color.toLowerCase() === c.toLowerCase()}
              onClick={() => set({ color: c })}
              className={`h-8 w-8 rounded-full border-2 ${layer.color.toLowerCase() === c.toLowerCase() ? 'border-primary ring-2 ring-primary/30' : 'border-[#E2E8F0]'}`}
              style={{ background: c }}
            />
          ))}
          <input type="color" aria-label="Any text colour" value={layer.color} onChange={(e) => set({ color: e.target.value.toUpperCase() }, true)} className="h-8 w-10 rounded border border-[#E2E8F0]" />
        </div>
        <div className="flex items-center gap-2">
          <ContrastBadge ratio={ratio} />
          {ratio < 4.5 && (
            <button type="button" onClick={() => set({ color: bestTextColor(behind) })} className="text-xs font-semibold text-primary hover:underline">
              Fix it
            </button>
          )}
        </div>
      </div>

      {layer.fill && (
        <div className="space-y-2">
          <p className={HEADING}>Label fill</p>
          <div className="flex flex-wrap gap-2">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Fill ${c}`}
                onClick={() => set({ fill: c, color: bestTextColor([c], [layer.color, '#FFFFFF', '#0B0B0F']) })}
                className={`h-8 w-8 rounded-lg border-2 ${layer.fill?.toLowerCase() === c.toLowerCase() ? 'border-primary' : 'border-[#E2E8F0]'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange, format }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const id = `slider-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <label htmlFor={id} className={HEADING}>
          {label}
        </label>
        <span className="text-xs font-semibold tabular-nums text-[#0B1C30]">{format(value)}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
    </div>
  );
}

function DesignSummary({ doc, onChange }: { doc: DesignDoc; onChange: Change }) {
  const low = lowContrastLayers(doc);
  return (
    <div className={`${PANEL} min-h-0 overflow-y-auto p-4 space-y-4`}>
      <h2 className="text-lg font-bold text-[#0B1C30]">Design</h2>
      <p className="text-sm text-[#464555]">Click any text on the design to change it. Drag to move it, or use the round handle to resize its box.</p>
      <p className="text-xs text-[#777587]">
        {FORMATS[doc.format].label} · {FORMATS[doc.format].width} × {FORMATS[doc.format].height}px
      </p>
      {low.length === 0 ? (
        <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
          <Icon icon="lucide:check" className="w-3.5 h-3.5" aria-hidden /> All text is easy to read
        </p>
      ) : (
        <div className="rounded-xl bg-red-50 p-3 space-y-2">
          <p className="text-sm font-semibold text-red-700">
            {low.length === 1 ? '1 text is' : `${low.length} texts are`} hard to read on this background.
          </p>
          <button type="button" onClick={() => onChange((d) => (d.background.kind === 'photo' ? readableOverlay(fixContrast(d)) : fixContrast(d)))} className="text-sm font-semibold text-primary hover:underline">
            {doc.background.kind === 'photo' ? 'Fix it' : 'Fix colours'}
          </button>
        </div>
      )}
      {doc.background.kind === 'photo' && <PhotoControls doc={doc} bg={doc.background} onChange={onChange} />}
    </div>
  );
}
