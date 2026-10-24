'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { STYLES, styleById, variationPalettes, type DesignText } from '@/lib/design/styles';
import { loadPhoto, rememberSaved, tonesOf } from './photos';
import { aiPhotoBackground, makeAi, type AiProgress } from './ai';
import { resetDate, useAiCredits } from './AiCredits';
import { sourceOf } from './postVisuals';
import { FORMATS, FORMAT_IDS, backgroundColors, isUnsavedPhoto, type DesignDoc, type FormatId, type PhotoBackground } from '@/lib/design/types';
import { worstContrast } from '@/lib/design/contrast';
import { createDesign, designerPath, rememberHandle, rememberedHandle, savePhoto, searchPhotos, writeDesignText } from '@/lib/api/designApi';
import { DESIGN_STYLE_IDS } from '@/lib/models/designWriter';
import { DesignCanvas } from './DesignCanvas';
import { CARD, Chip, CostBadge, INPUT, LABEL, PrimaryButton, SecondaryButton } from './ui';

type StyleChoice = 'auto' | string;
type Source = 'template' | 'stock' | 'ai_image' | 'ai_video';
const isAi = (s: Source) => s === 'ai_image' || s === 'ai_video';

const SOURCES = [
  { id: 'template', name: 'Text design', line: 'Bold text on a colour', icon: 'lucide:type', cost: 'free' as const, ready: true },
  { id: 'stock', name: 'Stock photo', line: 'Real photo with text on top', icon: 'lucide:image', cost: 'free' as const, ready: true },
  { id: 'ai_image', name: 'AI image', line: 'A new image made by AI', icon: 'lucide:sparkles', cost: 1, ready: true },
  { id: 'ai_video', name: 'AI video', line: 'A 5-second clip made by AI', icon: 'lucide:clapperboard', cost: 5, ready: true },
];

const isFormat = (v: string | null): v is FormatId => !!v && (FORMAT_IDS as string[]).includes(v);
const isWriterStyle = (id: string): id is (typeof DESIGN_STYLE_IDS)[number] => (DESIGN_STYLE_IDS as readonly string[]).includes(id);

export function CreateDesign() {
  const router = useRouter();
  const params = useSearchParams();
  const [prompt, setPrompt] = useState(params.get('prompt') ?? '');
  const [format, setFormat] = useState<FormatId>(isFormat(params.get('format')) ? (params.get('format') as FormatId) : 'square');
  const [source, setSource] = useState<Source>(() => {
    const s = params.get('source');
    return s === 'stock' || s === 'ai_image' || s === 'ai_video' ? s : 'template';
  });
  const { credits, available: aiAvailable, refresh: refreshCredits } = useAiCredits();
  const [aiProgress, setAiProgress] = useState<AiProgress | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [style, setStyle] = useState<StyleChoice>(params.get('style') ?? 'auto');
  const [text, setText] = useState<DesignText>({ headline: '', kicker: '', body: '', footer: '' });
  const [photoQuery, setPhotoQuery] = useState('');
  const [photoPage, setPhotoPage] = useState(1);
  const [results, setResults] = useState<DesignDoc[]>([]);
  const [busy, setBusy] = useState<'write' | 'create' | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState('');
  const autoRan = useRef(false);

  useEffect(() => {
    setText((t) => ({ ...t, footer: t.footer || rememberedHandle() }));
  }, []);

  const stylesForSource = STYLES.filter((s) => !!s.usesPhoto === (source !== 'template'));
  const chosenStyle = style === 'auto' ? null : styleById(style);

  const pickSource = (next: Source) => {
    setSource(next);
    setResults([]);
    setStyle((st) => (st !== 'auto' && !!styleById(st)?.usesPhoto !== (next === 'stock') ? 'auto' : st));
  };

  /** Asks the writer for the words (and a style, if none is picked) */
  const write = async (): Promise<{ text: DesignText; styleId: string; photoQuery: string; imagePrompt: string } | null> => {
    if (prompt.trim().length < 3) {
      setError('Say a few words about the post first.');
      return null;
    }
    const written = await writeDesignText({ prompt, ...(style !== 'auto' && isWriterStyle(style) ? { styleId: style } : {}) });
    const next = { ...text, headline: written.headline, kicker: written.kicker ?? '', body: written.body ?? '' };
    setText(next);
    setPhotoQuery(written.photoQuery ?? '');
    setImagePrompt(written.imagePrompt ?? '');
    return { text: next, styleId: written.styleId, photoQuery: written.photoQuery ?? '', imagePrompt: written.imagePrompt ?? '' };
  };

  const makeText = (words: DesignText, styleId: string) => {
    const s = styleById(styleId) ?? STYLES[0];
    setResults(variationPalettes(s).map((p) => s.build(clean(words), format, p)));
  };

  /** One design over a new AI image (or video) */
  const makeAiDesign = async (words: DesignText, description: string) => {
    setResults([]);
    try {
      const job = await makeAi(source === 'ai_video' ? 'video' : 'image', description || prompt, format, setAiProgress);
      const s = chosenStyle?.usesPhoto ? chosenStyle : styleById('photo-text')!;
      const doc = s.build(clean(words), format, variationPalettes(s)[0], await aiPhotoBackground(job));
      setResults([job.mediaId ? { ...doc, video: { mediaId: job.mediaId, durationSeconds: 5 } } : doc]);
    } finally {
      setAiProgress(null);
      refreshCredits();
    }
  };

  /** 4 designs over 4 different stock photos */
  const makeStock = async (words: DesignText, query: string, page = 1) => {
    const s = chosenStyle?.usesPhoto ? chosenStyle : styleById('photo-text')!;
    const q = query.trim() || prompt.split(/\s+/).filter((w) => w.length > 3).slice(0, 2).join(' ') || 'lifestyle';
    const photos = await searchPhotos(q, format === 'square' ? 'all' : 'vertical', page);
    if (!photos.length) {
      setResults([]);
      setError(`No photos found for “${q}”. Try different words in the description.`);
      return;
    }
    const picks = photos.slice(0, 4);
    const docs = await Promise.all(
      picks.map(async (photo, i) => {
        const photoId = `pixabay:${photo.id}`;
        const img = await loadPhoto({ photoId, previewUrl: photo.previewUrl });
        const bg: PhotoBackground = {
          kind: 'photo',
          photoId,
          previewUrl: photo.previewUrl,
          width: img.width,
          height: img.height,
          focusX: 0.5,
          focusY: 0.5,
          fit: 'fill',
          tones: tonesOf(img),
          credit: { ...photo.credit, source: 'pixabay' },
        };
        return s.build(clean(words), format, variationPalettes(s)[i % 4], bg);
      })
    );
    setResults(docs);
  };

  const writeForMe = async () => {
    setBusy('write');
    setError('');
    try {
      const r = await write();
      if (r && style === 'auto' && source === 'template') setStyle(r.styleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t write that');
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    setBusy('create');
    setError('');
    setPhotoPage(1);
    try {
      let words = text;
      let styleId = chosenStyle?.id ?? 'bold-statement';
      let query = photoQuery;
      let description = imagePrompt;
      if (!text.headline.trim() || (isAi(source) && !imagePrompt)) {
        const r = await write();
        if (!r) return;
        words = r.text;
        query = r.photoQuery;
        description = r.imagePrompt;
        if (style === 'auto' && source === 'template') {
          setStyle(r.styleId);
          styleId = r.styleId;
        }
      }
      if (isAi(source)) await makeAiDesign(words, description);
      else if (source === 'stock') await makeStock(words, query);
      else makeText(words, styleId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t make the designs');
    } finally {
      setBusy(null);
    }
  };

  // Coming from the home page's prompt bar: start straight away
  useEffect(() => {
    if (autoRan.current || !params.get('prompt')) return;
    autoRan.current = true;
    void create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tryMore = async () => {
    setError('');
    if (isAi(source)) return create();
    if (source === 'stock') {
      const next = photoPage + 1;
      setPhotoPage(next);
      setBusy('create');
      try {
        await makeStock(text, photoQuery, next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Couldn’t find more photos');
      } finally {
        setBusy(null);
      }
      return;
    }
    const current = results[0]?.styleId;
    const others = stylesForSource.filter((s) => s.id !== current);
    const next = others[Math.floor(Math.random() * others.length)];
    setStyle(next.id);
    makeText(text, next.id);
  };

  const open = async (doc: DesignDoc, i: number) => {
    setOpening(i);
    setError('');
    try {
      let toSave = doc;
      const bg = doc.background;
      if (bg.kind === 'photo' && isUnsavedPhoto(bg.photoId)) {
        const saved = await savePhoto(Number(bg.photoId.split(':')[1]));
        rememberSaved(bg.photoId, { ...bg, photoId: saved.photoId, previewUrl: undefined });
        toSave = { ...doc, background: { ...bg, photoId: saved.photoId, previewUrl: undefined } };
      }
      if (text.footer?.startsWith('@')) rememberHandle(text.footer);
      const design = await createDesign({
        name: (text.headline || 'New design').replace(/\n/g, ' ').slice(0, 60),
        source: sourceOf(toSave),
        doc: toSave,
      });
      router.push(designerPath(design.designId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t save the design');
      setOpening(null);
    }
  };

  const showBody = (chosenStyle?.id ?? results[0]?.styleId) === 'headline-body';

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div>
        <Link href="/dashboard/designer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Icon icon="lucide:chevron-left" className="w-4 h-4" aria-hidden /> Back to Designer
        </Link>
        <h1 className="mt-1 text-[28px] font-bold font-heading text-[#0B1C30]">New design</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,38%)_1fr] gap-6 items-start">
        <form
          className={`${CARD} p-6 space-y-6`}
          onSubmit={(e) => {
            e.preventDefault();
            void create();
          }}
        >
          <div>
            <label htmlFor="d-prompt" className={LABEL}>
              What’s the post about?
            </label>
            <textarea
              id="d-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A bold motivational post about showing up even on low-energy days, for my fitness page."
              className={`${INPUT} resize-none`}
            />
          </div>

          <fieldset>
            <legend className={LABEL}>Format</legend>
            <div className="flex flex-wrap gap-2">
              {FORMAT_IDS.map((id) => (
                <Chip key={id} selected={format === id} onClick={() => setFormat(id)}>
                  {FORMATS[id].label}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <div className="flex items-center justify-between gap-2 mb-2">
              <legend className="text-sm font-semibold text-[#0B1C30]">Make it with</legend>
              {credits && (
                <span className="text-xs text-[#777587]">
                  {credits.left} of {credits.limit} AI credits left · Resets {resetDate(credits.resetsAt)}
                </span>
              )}
            </div>
            {credits && credits.left === 0 && (
              <p className="mb-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
                Free options still work: text designs and stock photos.
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {SOURCES.map((s) => {
                const cost = typeof s.cost === 'number' ? s.cost : 0;
                const outOfCredits = cost > 0 && (!aiAvailable || (credits !== null && credits.left < cost));
                const usable = s.ready && !outOfCredits;
                return (
                  <button
                    type="button"
                    key={s.id}
                    disabled={!usable}
                    aria-pressed={source === s.id}
                    onClick={() => pickSource(s.id as Source)}
                    className={`text-left rounded-xl border p-3 transition-colors ${
                      source === s.id
                        ? 'border-primary bg-primary-50/60 ring-1 ring-primary'
                        : usable
                          ? 'border-[#E2E8F0] bg-white hover:border-primary/40'
                          : 'border-[#E2E8F0] bg-[#F8F9FF] opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Icon icon={s.icon} className={`w-5 h-5 ${source === s.id ? 'text-primary' : 'text-[#777587]'}`} aria-hidden />
                      {outOfCredits ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                          <Icon icon="lucide:lock" className="w-3 h-3" aria-hidden /> {aiAvailable ? 'No credits left' : 'Unavailable'}
                        </span>
                      ) : (
                        <CostBadge cost={s.ready ? s.cost : 'soon'} />
                      )}
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#0B1C30]">{s.name}</p>
                    <p className="text-xs text-[#777587]">{s.line}</p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LABEL}>Style</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={style === 'auto'} onClick={() => setStyle('auto')}>
                Pick for me
              </Chip>
              {stylesForSource.map((s) => (
                <Chip key={s.id} selected={style === s.id} onClick={() => setStyle(s.id)}>
                  {s.name}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="d-headline" className="text-sm font-semibold text-[#0B1C30]">
                Text on the design
              </label>
              <button type="button" onClick={writeForMe} disabled={!!busy} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline disabled:opacity-50">
                {busy === 'write' && <Icon icon="lucide:loader-circle" className="w-3.5 h-3.5 animate-spin" aria-hidden />}
                Write it for me
              </button>
            </div>
            <textarea
              id="d-headline"
              rows={2}
              value={text.headline}
              onChange={(e) => setText({ ...text, headline: e.target.value })}
              placeholder={'SHOW UP\nANYWAY.'}
              className={`${INPUT} resize-none text-base font-extrabold`}
            />
            <div className="grid grid-cols-2 gap-3">
              <input aria-label="Small label above" value={text.kicker} onChange={(e) => setText({ ...text, kicker: e.target.value })} placeholder="Small label (optional)" className={INPUT} />
              <input aria-label="Your handle" value={text.footer} onChange={(e) => setText({ ...text, footer: e.target.value })} placeholder="@yourbrand (optional)" className={INPUT} />
            </div>
            {showBody && (
              <input aria-label="Supporting line" value={text.body} onChange={(e) => setText({ ...text, body: e.target.value })} placeholder="One supporting line" className={INPUT} />
            )}
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600">
              {error}
            </p>
          )}

          <div>
            <PrimaryButton type="submit" disabled={!!busy} className="w-full h-12">
              {busy === 'create' && <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" aria-hidden />}
              {isAi(source) ? (source === 'ai_video' ? 'Make the AI video' : 'Make the AI image') : 'Create 4 designs'}
            </PrimaryButton>
            <p className="mt-2 text-center text-xs text-[#777587]">
              {isAi(source)
                ? `Uses ${source === 'ai_video' ? 5 : 1} AI ${source === 'ai_video' ? 'credits' : 'credit'}${credits ? ` · ${Math.max(0, credits.left - (source === 'ai_video' ? 5 : 1))} left after this` : ''}`
                : 'Free · uses no credits'}
            </p>
          </div>
        </form>

        <section className={`${CARD} p-6`} aria-labelledby="pick-title" aria-busy={busy === 'create'}>
          <h2 id="pick-title" className="text-xl font-bold font-heading text-[#0B1C30]">
            Pick one
          </h2>
          {aiProgress ? (
            <AiMaking kind={source === 'ai_video' ? 'video' : 'image'} progress={aiProgress} description={imagePrompt || prompt} onUseStock={() => pickSource('stock')} />
          ) : results.length === 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`aspect-[4/5] rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8F9FF] ${busy === 'create' ? 'animate-pulse' : ''}`}
                />
              ))}
              <p className="col-span-2 text-center text-sm text-[#777587]">{isAi(source) ? 'Your AI design appears here.' : 'Your 4 designs appear here.'}</p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {results.map((doc, i) => (
                  <ResultCard key={`${doc.styleId}-${i}`} doc={doc} busy={opening === i} disabled={opening !== null} onOpen={() => open(doc, i)} />
                ))}
              </div>
              {source === 'stock' && (
                <p className="mt-4 text-center text-xs text-[#777587]">
                  Free photos from{' '}
                  <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
                    Pixabay
                  </a>
                </p>
              )}
              <div className="mt-5 flex justify-center">
                <SecondaryButton type="button" onClick={tryMore} disabled={!!busy}>
                  <Icon icon="lucide:refresh-cw" className="w-4 h-4" aria-hidden />{' '}
                  {isAi(source) ? `Make another (${source === 'ai_video' ? 5 : 1} ${source === 'ai_video' ? 'credits' : 'credit'})` : source === 'stock' ? 'Try other photos' : 'Try another style'}
                </SecondaryButton>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function ResultCard({ doc, busy, disabled, onOpen }: { doc: DesignDoc; busy: boolean; disabled: boolean; onOpen: () => void }) {
  const ratio = useMemo(() => Math.min(...doc.layers.map((l) => worstContrast(l.color, l.fill ? [l.fill] : backgroundColors(doc)))), [doc]);
  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl shadow-sm">
        <DesignCanvas doc={doc} resolution={0.6} />
        {doc.video && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">
            <Icon icon="lucide:play" className="w-3 h-3" aria-hidden /> AI video · {doc.video.durationSeconds}s
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 group-hover:bg-black/35 group-hover:opacity-100 focus-within:bg-black/35 focus-within:opacity-100 transition">
          <button type="button" onClick={onOpen} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 h-10 text-sm font-semibold text-[#0B1C30] shadow">
            {busy ? <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin" aria-hidden /> : <Icon icon="lucide:pencil" className="w-4 h-4" aria-hidden />}
            Edit this one
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {ratio >= 4.5 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs font-semibold">
            High contrast <Icon icon="lucide:check" className="w-3 h-3" aria-hidden />
          </span>
        ) : (
          <span />
        )}
        <button type="button" onClick={onOpen} disabled={disabled} className="text-xs font-semibold text-primary hover:underline lg:hidden">
          Edit
        </button>
      </div>
    </div>
  );
}

function clean(t: DesignText): DesignText {
  const v = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  return { headline: t.headline.trim() || 'Your words here', kicker: v(t.kicker), body: v(t.body), footer: v(t.footer) };
}

/** The "Making your AI image" card while Higgsfield works */
function AiMaking({ kind, progress, description, onUseStock }: { kind: 'image' | 'video'; progress: AiProgress; description: string; onUseStock: () => void }) {
  const steps: { label: string; done: boolean; active: boolean }[] = [
    { label: 'Description read', done: progress !== 'starting', active: progress === 'starting' },
    { label: kind === 'video' ? 'First frame being made' : 'Image being made', done: progress === 'video' || progress === 'done', active: progress === 'image' },
    ...(kind === 'video' ? [{ label: 'Video being made', done: progress === 'done', active: progress === 'video' }] : []),
  ];
  const pct = progress === 'starting' ? 10 : progress === 'image' ? (kind === 'video' ? 35 : 60) : progress === 'video' ? 70 : 100;
  return (
    <div className="mt-5 space-y-4" role="status" aria-live="polite">
      <div className="flex flex-col sm:flex-row gap-5 rounded-2xl border border-[#E2E8F0] p-5">
        <div className="relative w-full sm:w-44 aspect-[9/16] max-h-72 rounded-xl overflow-hidden bg-gradient-to-br from-indigo-200 via-violet-200 to-indigo-100 flex items-center justify-center">
          <div className="absolute inset-0 animate-pulse bg-white/30" />
          <span className="relative w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
            <Icon icon="lucide:sparkles" className="w-7 h-7 animate-pulse" aria-hidden />
          </span>
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <h3 className="text-xl font-bold text-[#0B1C30]">Making your AI {kind}</h3>
          <p className="rounded-xl bg-[#F8F9FF] px-3 py-2 text-sm italic text-[#464555] line-clamp-3">“{description}”</p>
          <div>
            <div className="flex justify-between text-xs text-[#777587]">
              <span>Progress</span>
              <span>{kind === 'video' ? 'About 2 minutes' : 'Under a minute'}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <ul className="space-y-1.5">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center gap-2 text-sm text-[#0B1C30]">
                {s.done ? (
                  <Icon icon="lucide:circle-check" className="w-4 h-4 text-primary" aria-hidden />
                ) : s.active ? (
                  <Icon icon="lucide:loader-circle" className="w-4 h-4 text-primary animate-spin" aria-hidden />
                ) : (
                  <Icon icon="lucide:circle" className="w-4 h-4 text-[#CBD5E1]" aria-hidden />
                )}
                {s.label}
              </li>
            ))}
          </ul>
          <p className="text-xs text-[#777587]">If it doesn’t work out, your credits are given back.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#E2E8F0] px-4 py-3">
        <Icon icon="lucide:image" className="w-5 h-5 text-[#777587]" aria-hidden />
        <p className="flex-1 text-sm text-[#464555]">Want it free and instant? Use a stock photo with text instead.</p>
        <button type="button" onClick={onUseStock} className="rounded-xl border border-[#E2E8F0] px-3 h-9 text-sm font-semibold text-[#0B1C30] hover:border-primary/40">
          Use a stock photo
        </button>
      </div>
    </div>
  );
}
