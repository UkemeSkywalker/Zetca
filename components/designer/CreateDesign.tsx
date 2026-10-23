'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { STYLES, styleById, variationPalettes, type DesignText } from '@/lib/design/styles';
import { FORMATS, FORMAT_IDS, backgroundColors, type DesignDoc, type FormatId } from '@/lib/design/types';
import { worstContrast } from '@/lib/design/contrast';
import { createDesign, designerPath, rememberedHandle, writeDesignText } from '@/lib/api/designApi';
import { DESIGN_STYLE_IDS } from '@/lib/models/designWriter';
import { DesignCanvas } from './DesignCanvas';
import { CARD, Chip, CostBadge, INPUT, LABEL, PrimaryButton, SecondaryButton } from './ui';

type StyleChoice = 'auto' | (typeof DESIGN_STYLE_IDS)[number];

const SOURCES = [
  { id: 'template', name: 'Text design', line: 'Bold text on a colour', icon: 'lucide:type', cost: 'free' as const, ready: true },
  { id: 'stock', name: 'Stock photo', line: 'Real photo with text on top', icon: 'lucide:image', cost: 'free' as const, ready: false },
  { id: 'ai_image', name: 'AI image', line: 'A new image made by AI', icon: 'lucide:sparkles', cost: 1, ready: false },
  { id: 'ai_video', name: 'AI video', line: 'A short clip made by AI', icon: 'lucide:clapperboard', cost: 5, ready: false },
];

const isFormat = (v: string | null): v is FormatId => !!v && (FORMAT_IDS as string[]).includes(v);

export function CreateDesign() {
  const router = useRouter();
  const params = useSearchParams();
  const [prompt, setPrompt] = useState(params.get('prompt') ?? '');
  const [format, setFormat] = useState<FormatId>(isFormat(params.get('format')) ? (params.get('format') as FormatId) : 'square');
  const [style, setStyle] = useState<StyleChoice>('auto');
  const [text, setText] = useState<DesignText>({ headline: '', kicker: '', body: '', footer: '' });
  const [results, setResults] = useState<DesignDoc[]>([]);
  const [busy, setBusy] = useState<'write' | 'create' | null>(null);
  const [opening, setOpening] = useState<number | null>(null);
  const [error, setError] = useState('');
  const autoRan = useRef(false);

  useEffect(() => {
    setText((t) => ({ ...t, footer: t.footer || rememberedHandle() }));
  }, []);

  const chosenStyle = style === 'auto' ? null : styleById(style);

  /** Asks the writer for the words (and a style, if none is picked) */
  const write = async (): Promise<{ text: DesignText; styleId: string } | null> => {
    if (prompt.trim().length < 3) {
      setError('Say a few words about the post first.');
      return null;
    }
    const written = await writeDesignText({ prompt, ...(style === 'auto' ? {} : { styleId: style }) });
    const next = { ...text, headline: written.headline, kicker: written.kicker ?? '', body: written.body ?? '' };
    setText(next);
    return { text: next, styleId: written.styleId };
  };

  const make = (words: DesignText, styleId: string) => {
    const s = styleById(styleId) ?? STYLES[0];
    setResults(variationPalettes(s).map((p) => s.build(clean(words), format, p)));
  };

  const writeForMe = async () => {
    setBusy('write');
    setError('');
    try {
      const r = await write();
      if (r && style === 'auto') setStyle(r.styleId as StyleChoice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t write that');
    } finally {
      setBusy(null);
    }
  };

  const create = async () => {
    setBusy('create');
    setError('');
    try {
      if (text.headline.trim()) {
        make(text, chosenStyle?.id ?? 'bold-statement');
      } else {
        const r = await write();
        if (r) {
          if (style === 'auto') setStyle(r.styleId as StyleChoice);
          make(r.text, style === 'auto' ? r.styleId : style);
        }
      }
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

  const tryMore = () => {
    const current = results[0]?.styleId;
    const others = STYLES.filter((s) => s.id !== current);
    const next = others[Math.floor(Math.random() * others.length)];
    setStyle(next.id as StyleChoice);
    make(text, next.id);
  };

  const open = async (doc: DesignDoc, i: number) => {
    setOpening(i);
    setError('');
    try {
      const design = await createDesign({ name: (text.headline || 'New design').replace(/\n/g, ' ').slice(0, 60), source: 'template', doc });
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
            <legend className={LABEL}>Make it with</legend>
            <div className="grid grid-cols-2 gap-3">
              {SOURCES.map((s) => (
                <div
                  key={s.id}
                  aria-disabled={!s.ready}
                  className={`rounded-xl border p-3 ${s.ready ? 'border-primary bg-primary-50/60 ring-1 ring-primary' : 'border-[#E2E8F0] bg-[#F8F9FF] opacity-60'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Icon icon={s.icon} className={`w-5 h-5 ${s.ready ? 'text-primary' : 'text-[#777587]'}`} aria-hidden />
                    <CostBadge cost={s.ready ? s.cost : 'soon'} />
                  </div>
                  <p className="mt-2 text-sm font-bold text-[#0B1C30]">{s.name}</p>
                  <p className="text-xs text-[#777587]">{s.line}</p>
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={LABEL}>Style</legend>
            <div className="flex flex-wrap gap-2">
              <Chip selected={style === 'auto'} onClick={() => setStyle('auto')}>
                Pick for me
              </Chip>
              {STYLES.map((s) => (
                <Chip key={s.id} selected={style === s.id} onClick={() => setStyle(s.id as StyleChoice)}>
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
              Create 4 designs
            </PrimaryButton>
            <p className="mt-2 text-center text-xs text-[#777587]">Free · uses no credits</p>
          </div>
        </form>

        <section className={`${CARD} p-6`} aria-labelledby="pick-title" aria-busy={busy === 'create'}>
          <h2 id="pick-title" className="text-xl font-bold font-heading text-[#0B1C30]">
            Pick one
          </h2>
          {results.length === 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`aspect-[4/5] rounded-2xl border-2 border-dashed border-[#E2E8F0] bg-[#F8F9FF] ${busy === 'create' ? 'animate-pulse' : ''}`}
                />
              ))}
              <p className="col-span-2 text-center text-sm text-[#777587]">Your 4 designs appear here.</p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-4">
                {results.map((doc, i) => (
                  <ResultCard key={`${doc.styleId}-${i}`} doc={doc} busy={opening === i} disabled={opening !== null} onOpen={() => open(doc, i)} />
                ))}
              </div>
              <div className="mt-5 flex justify-center">
                <SecondaryButton type="button" onClick={tryMore}>
                  <Icon icon="lucide:refresh-cw" className="w-4 h-4" aria-hidden /> Try another style
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
        <DesignCanvas doc={doc} />
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
