'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { FORMATS, FORMAT_IDS, isUnsavedPhoto, type DesignDoc, type DesignRecord, type FormatId } from '@/lib/design/types';
import { changeFormat, clampBox, duplicateLayer, removeLayer, updateLayer } from '@/lib/design/edit';
import { designToBlob } from '@/lib/design/render';
import { getDesign, saveDesign } from '@/lib/api/designApi';
import { DesignCanvas } from './DesignCanvas';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { photosFor, withSavedPhoto } from './photos';
import { exportDesign, sourceOf, updatePostVisual } from './postVisuals';
import { getDownloadUrl } from '@/lib/api/mediaClient';
import { LeftPanel, RightPanel, type Tab } from './EditorPanels';
import { SecondaryButton, PrimaryButton } from './ui';
import { VideoBar } from './VideoBar';

type SaveState = 'saved' | 'saving' | 'unsaved' | 'error';

const HISTORY_LIMIT = 60;

export function DesignEditor({ designId }: { designId: string }) {
  const [design, setDesign] = useState<DesignRecord | null>(null);
  const [loadError, setLoadError] = useState('');
  const [doc, setDoc] = useState<DesignDoc | null>(null);
  const [name, setName] = useState('');
  const [past, setPast] = useState<DesignDoc[]>([]);
  const [future, setFuture] = useState<DesignDoc[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('text');
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [downloading, setDownloading] = useState(false);
  const [updatingPost, setUpdatingPost] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const lastPush = useRef(0);

  useEffect(() => {
    getDesign(designId).then(
      (d) => {
        setDesign(d);
        setDoc(d.doc);
        setName(d.name);
        setSelected(d.doc.layers.find((l) => l.role === 'headline')?.id ?? null);
        // A style example still has its sample photo: offer real ones first
        if (d.doc.background.kind === 'photo' && d.doc.background.photoId.startsWith('sample:')) setTab('photos');
      },
      (err) => setLoadError(err instanceof Error ? err.message : 'Couldn’t open this design')
    );
  }, [designId]);

  // The latest design, so changes made in quick succession (dragging) build on each other
  const docRef = useRef<DesignDoc | null>(null);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  /**
   * Changes the design. Quick bursts of changes (typing, dragging a slider)
   * become one undo step.
   */
  const change = useCallback(
    (next: DesignDoc | ((d: DesignDoc) => DesignDoc), { coalesce = false }: { coalesce?: boolean } = {}) => {
      const current = docRef.current;
      if (!current) return;
      const value = typeof next === 'function' ? next(current) : next;
      if (value === current) return;
      const now = Date.now();
      if (!coalesce || now - lastPush.current > 700) {
        setPast((p) => [...p.slice(-HISTORY_LIMIT + 1), current]);
        setFuture([]);
      }
      lastPush.current = now;
      docRef.current = value;
      setDoc(value);
      setSaveState('unsaved');
    },
    []
  );

  const undo = useCallback(() => {
    const current = docRef.current;
    if (!past.length || !current) return;
    setFuture((f) => [current, ...f]);
    setPast(past.slice(0, -1));
    setDoc(past[past.length - 1]);
    setSaveState('unsaved');
  }, [past]);

  const redo = useCallback(() => {
    const current = docRef.current;
    if (!future.length || !current) return;
    setPast((p) => [...p, current]);
    setFuture(future.slice(1));
    setDoc(future[0]);
    setSaveState('unsaved');
  }, [future]);

  const save = useCallback(async () => {
    if (!doc || !design) return;
    const toSave = withSavedPhoto(doc);
    // A photo still being copied to storage: try again once it's there
    if (toSave.background.kind === 'photo' && isUnsavedPhoto(toSave.background.photoId)) return;
    setSaveState('saving');
    try {
      const source = sourceOf(toSave);
      const saved = await saveDesign(design.designId, { name: name.trim() || 'Untitled design', source, doc: toSave });
      setDesign(saved);
      setSaveState((s) => (s === 'saving' ? 'saved' : s));
    } catch {
      setSaveState('error');
    }
  }, [doc, design, name]);

  // Saves on its own a moment after the last change
  useEffect(() => {
    if (saveState !== 'unsaved') return;
    const t = setTimeout(save, 1200);
    return () => clearTimeout(t);
  }, [saveState, doc, name, save]);

  // Keyboard: undo/redo, delete, nudge
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest('input, textarea, select, [contenteditable="true"]');
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (typing || !selected) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        change((d) => removeLayer(d, selected));
        setSelected(null);
      }
      const step = e.shiftKey ? 20 : 4;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        change((d) => {
          const l = d.layers.find((x) => x.id === selected);
          return l ? updateLayer(d, l.id, clampBox(d, { ...l, x: l.x + dx, y: l.y + dy })) : d;
        }, { coalesce: true });
      }
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, undo, redo, change]);

  const download = async () => {
    if (!doc) return;
    setDownloading(true);
    try {
      if (doc.video) {
        // Videos are put together on the server, with the words on top
        const { mediaId } = await exportDesign(withSavedPhoto(doc), name || 'design');
        const { downloadUrl } = await getDownloadUrl(mediaId);
        window.open(downloadUrl, '_blank', 'noopener');
        return;
      }
      await loadDesignFonts();
      const blob = await designToBlob(doc, FONT_FAMILIES, await photosFor(doc));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(name || 'design').replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'design'}.${blob.type === 'image/jpeg' ? 'jpg' : 'png'}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setDownloading(false);
    }
  };

  /** Saves the design and gives its post the new image */
  const updatePost = async () => {
    if (!doc || !design) return;
    const toSave = withSavedPhoto(doc);
    if (toSave.background.kind === 'photo' && isUnsavedPhoto(toSave.background.photoId)) return;
    setUpdatingPost('busy');
    try {
      const { design: saved } = await updatePostVisual(design, toSave, name.trim() || design.name);
      setDesign(saved);
      setSaveState('saved');
      setUpdatingPost('done');
      setTimeout(() => setUpdatingPost('idle'), 2500);
    } catch {
      setUpdatingPost('error');
    }
  };

  if (loadError) {
    return (
      <div className="max-w-md mx-auto mt-16 text-center space-y-4">
        <p className="text-lg font-semibold text-[#0B1C30]">{loadError}</p>
        <Link href="/dashboard/designer" className="text-sm font-semibold text-primary hover:underline">
          Back to Designer
        </Link>
      </div>
    );
  }

  if (!doc || !design) {
    return <div className="h-[70vh] rounded-2xl bg-white/60 animate-pulse" aria-label="Opening design" />;
  }

  const layer = doc.layers.find((l) => l.id === selected) ?? null;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-78px-60px)] min-h-[640px]">
      {/* Top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white border border-[#E2E8F0] px-3 py-2.5">
        <Link href="/dashboard/designer" aria-label="Back to Designer" className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#0B1C30]">
          <Icon icon="lucide:arrow-left" className="w-5 h-5" aria-hidden />
        </Link>
        <div className="flex items-center gap-1.5 min-w-0">
          <label htmlFor="design-name" className="sr-only">
            Design name
          </label>
          <input
            id="design-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSaveState('unsaved');
            }}
            className="min-w-0 w-[180px] sm:w-[220px] rounded-lg px-2 py-1.5 text-base font-bold text-[#0B1C30] hover:bg-[#F1F5F9] focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <SaveStatus state={saveState} onRetry={save} />
        </div>
        <div className="flex items-center gap-2 lg:mx-auto">
          <label htmlFor="design-format" className="sr-only">
            Size
          </label>
          <select
            id="design-format"
            value={doc.format}
            onChange={(e) => change((d) => changeFormat(d, e.target.value as FormatId))}
            className="h-10 rounded-xl border border-[#E2E8F0] bg-[#F8F9FF] px-3 text-sm font-semibold text-[#0B1C30]"
          >
            {FORMAT_IDS.map((id) => (
              <option key={id} value={id}>
                {FORMATS[id].label}
              </option>
            ))}
          </select>
          <button type="button" onClick={undo} disabled={!past.length} aria-label="Undo" className="p-2 rounded-lg text-[#0B1C30] hover:bg-[#F1F5F9] disabled:opacity-30">
            <Icon icon="lucide:undo-2" className="w-5 h-5" aria-hidden />
          </button>
          <button type="button" onClick={redo} disabled={!future.length} aria-label="Redo" className="p-2 rounded-lg text-[#0B1C30] hover:bg-[#F1F5F9] disabled:opacity-30">
            <Icon icon="lucide:redo-2" className="w-5 h-5" aria-hidden />
          </button>
        </div>
        <div className="flex items-center gap-2 ml-auto lg:ml-0">
          <SecondaryButton type="button" onClick={download} disabled={downloading} className="h-10">
            {downloading ? <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" aria-hidden /> : <Icon icon="lucide:download" className="w-4 h-4" aria-hidden />}
            Download
          </SecondaryButton>
          {design.attachedTo ? (
            <PrimaryButton type="button" onClick={updatePost} disabled={updatingPost === 'busy'} className="h-10">
              {updatingPost === 'busy' ? (
                <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" aria-hidden />
              ) : (
                <Icon icon={updatingPost === 'done' ? 'lucide:check' : 'lucide:send'} className="w-4 h-4" aria-hidden />
              )}
              {updatingPost === 'done' ? 'Post updated' : updatingPost === 'error' ? 'Try again' : 'Update post'}
            </PrimaryButton>
          ) : (
            <PrimaryButton type="button" onClick={save} disabled={saveState === 'saving' || saveState === 'saved'} className="h-10">
              Save
            </PrimaryButton>
          )}
        </div>
      </div>

      {doc.video && <VideoBar video={doc.video} onVideo={(video) => change((d) => ({ ...d, video }))} />}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-4">
        <LeftPanel tab={tab} onTab={setTab} doc={doc} onChange={change} onSelect={setSelected} selected={selected} />
        <Stage doc={doc} selected={selected} onSelect={setSelected} onChange={change} />
        <RightPanel doc={doc} layer={layer} onChange={change} />
      </div>
    </div>
  );
}

function SaveStatus({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  if (state === 'error') {
    return (
      <button type="button" onClick={onRetry} className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
        <Icon icon="lucide:triangle-alert" className="w-3.5 h-3.5" aria-hidden /> Not saved · Retry
      </button>
    );
  }
  const label = state === 'saved' ? 'Saved' : state === 'saving' ? 'Saving…' : 'Unsaved';
  return (
    <span role="status" className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${state === 'saved' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
      {state === 'saved' && <Icon icon="lucide:check" className="w-3.5 h-3.5" aria-hidden />}
      {label}
    </span>
  );
}

/** The canvas with clickable, draggable boxes over each text layer */
function Stage({
  doc,
  selected,
  onSelect,
  onChange,
}: {
  doc: DesignDoc;
  selected: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: (d: DesignDoc) => DesignDoc, opts?: { coalesce?: boolean }) => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 600, h: 600 });
  const drag = useRef<{ id: string; mode: 'move' | 'resize'; startX: number; startY: number; box: { x: number; y: number; width: number; height: number } } | null>(null);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setArea({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width: W, height: H } = FORMATS[doc.format];
  const scale = Math.max(0.1, Math.min((area.w - 48) / W, (area.h - 48) / H));

  const start = (e: React.PointerEvent, id: string, mode: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault();
    onSelect(id);
    const l = doc.layers.find((x) => x.id === id);
    if (!l) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id, mode, startX: e.clientX, startY: e.clientY, box: { x: l.x, y: l.y, width: l.width, height: l.height } };
  };

  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    onChange((docNow) => {
      let box = d.mode === 'move' ? { ...d.box, x: d.box.x + dx, y: d.box.y + dy } : { ...d.box, width: d.box.width + dx, height: d.box.height + dy };
      // Snap to the middle when close
      if (d.mode === 'move' && Math.abs(box.x + box.width / 2 - W / 2) < 12) box = { ...box, x: (W - box.width) / 2 };
      return updateLayer(docNow, d.id, clampBox(docNow, box));
    }, { coalesce: true });
  };

  const end = () => {
    drag.current = null;
  };

  const sel = doc.layers.find((l) => l.id === selected);

  return (
    <div
      ref={areaRef}
      className="relative min-h-[420px] rounded-2xl border border-[#E2E8F0] bg-[#F1F5F9] flex items-center justify-center overflow-hidden"
      style={{ backgroundImage: 'radial-gradient(#CBD5E1 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      onPointerDown={() => onSelect(null)}
    >
      <div className="relative shadow-xl" style={{ width: W * scale, height: H * scale }}>
        <DesignCanvas doc={doc} />
        {doc.video && (
          <span className="pointer-events-none absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
            <Icon icon="lucide:play" className="w-3.5 h-3.5" aria-hidden /> AI video · {doc.video.durationSeconds}s · words go on top
          </span>
        )}
        {doc.layers.map((l) => (
          <div
            key={l.id}
            role="button"
            tabIndex={0}
            aria-label={`Text: ${l.text.replace(/\n/g, ' ') || 'empty'}`}
            aria-pressed={selected === l.id}
            onPointerDown={(e) => start(e, l.id, 'move')}
            onPointerMove={move}
            onPointerUp={end}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSelect(l.id);
            }}
            className={`absolute cursor-move touch-none outline-none ${selected === l.id ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/60 focus-visible:ring-2 focus-visible:ring-primary/60'}`}
            style={{ left: l.x * scale, top: l.y * scale, width: l.width * scale, height: l.height * scale }}
          >
            {selected === l.id && (
              <span
                role="presentation"
                onPointerDown={(e) => start(e, l.id, 'resize')}
                onPointerMove={move}
                onPointerUp={end}
                className="absolute -right-2 -bottom-2 h-4 w-4 rounded-full border-2 border-primary bg-white cursor-nwse-resize"
              />
            )}
          </div>
        ))}
        {sel && (
          <div
            className="absolute z-10 flex items-center gap-0.5 rounded-xl bg-white p-1 shadow-lg border border-[#E2E8F0]"
            style={{ left: Math.max(0, sel.x * scale), top: Math.max(-44, sel.y * scale - 48) }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                type="button"
                aria-label={`Align ${a}`}
                aria-pressed={sel.align === a}
                onClick={() => onChange((d) => updateLayer(d, sel.id, { align: a }))}
                className={`p-1.5 rounded-lg ${sel.align === a ? 'bg-primary-50 text-primary' : 'text-[#464555] hover:bg-[#F1F5F9]'}`}
              >
                <Icon icon={`lucide:align-${a === 'center' ? 'center' : a}`} className="w-4 h-4" aria-hidden />
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-[#E2E8F0]" />
            <button
              type="button"
              aria-label="Duplicate"
              onClick={() => {
                let newId = '';
                onChange((d) => {
                  const r = duplicateLayer(d, sel.id);
                  newId = r.id;
                  return r.doc;
                });
                setTimeout(() => newId && onSelect(newId));
              }}
              className="p-1.5 rounded-lg text-[#464555] hover:bg-[#F1F5F9]"
            >
              <Icon icon="lucide:copy" className="w-4 h-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Delete"
              onClick={() => {
                onChange((d) => removeLayer(d, sel.id));
                onSelect(null);
              }}
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
            >
              <Icon icon="lucide:trash-2" className="w-4 h-4" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
