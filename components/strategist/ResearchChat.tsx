'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@iconify/react';
import { chatAboutResearch, editResearch, getResearch, startResearch, type PublicBrandResearch } from '@/lib/api/researchClient';
import { refreshCredits } from '@/lib/api/billingClient';
import type { BrandEdit, BrandProfile, ChatTurn, CompetitorFound, MediaImage, MediaVideo, ResearchStep, Socials } from '@/lib/models/brandResearch';
import { applyBrandEdit, FIELD_LABELS, listOf, noteHandEdit } from '@/lib/research/brandEdit';
import { ColorsEditor, EditableChips, EditableText, FontPicker, inkOn } from './BrandEditors';
import { PENDING_PROMPT_KEY } from './TalkToZetca';
import { TalkBackground } from './TalkBackground';
import { SuggestedStyles } from './SuggestedStyles';

const POLL_MS = 2500;
const GLASS = 'rounded-3xl border border-white/10 bg-white/[0.06] backdrop-blur-xl';
/** The result cards: white with dark text */
const CARD = 'rounded-3xl border border-white bg-white text-[#0b1c30]';
const LABEL = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748b]';

const SOCIAL_ICONS: Record<string, string> = {
  instagram: 'simple-icons:instagram',
  tiktok: 'simple-icons:tiktok',
  linkedin: 'simple-icons:linkedin',
  x: 'simple-icons:x',
  facebook: 'simple-icons:facebook',
  youtube: 'simple-icons:youtube',
};
const VIDEO_ICONS: Record<MediaVideo['platform'], string> = {
  youtube: 'simple-icons:youtube',
  vimeo: 'simple-icons:vimeo',
  tiktok: 'simple-icons:tiktok',
  instagram: 'simple-icons:instagram',
  file: 'lucide:film',
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};


/** Script and handwriting fonts suit a name, not a whole sentence */
const SCRIPT_FONT = /script|hand|brush|signature|pinyon|vibes|cursive|calligraph|dancing|pacifico|satisfy/i;

/** Ideas for the chat box, before the user has said anything */
const CHAT_IDEAS = ['Make the colours warmer', 'Try a bolder heading font', 'Make the tagline shorter'];

const googleFontsHref = (fonts: string[]) =>
  `https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`).join('&')}&display=swap`;

/**
 * Talk to Zetca's conversation, in the Strategist's dark style: starts the
 * research from the message sent on the Strategist page (or reopens one by
 * ?id=), then fills a visual board as findings arrive: photos, the brand kit,
 * brands like yours and what works for them.
 */
export function ResearchChat() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get('id');
  const [research, setResearch] = useState<PublicBrandResearch | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const started = useRef(false);
  // The chat after the research
  const [draft, setDraft] = useState('');
  const [asking, setAsking] = useState<string | null>(null);
  const [chatError, setChatError] = useState('');
  const [editError, setEditError] = useState('');
  const saving = useRef<Promise<unknown>>(Promise.resolve());
  const chatEnd = useRef<HTMLDivElement>(null);

  // A message waiting from the Strategist page: start the research
  useEffect(() => {
    if (id || started.current) return;
    started.current = true;
    let pending: string | null = null;
    try {
      pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
    } catch {
      // private windows
    }
    if (!pending) {
      router.replace('/dashboard/strategist');
      return;
    }
    const sent = pending;
    queueMicrotask(() => setMessage(sent));
    startResearch(sent).then(
      (r) => {
        setResearch(r);
        router.replace(`/dashboard/strategist/chat?id=${r.researchId}`);
        void refreshCredits();
      },
      (e: Error) => setError(e.message)
    );
  }, [id, router]);

  // Check on it until it's finished
  useEffect(() => {
    if (!id) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const r = await getResearch(id);
        if (stop) return;
        setResearch(r);
        if (r.status === 'working') timer = setTimeout(tick, POLL_MS);
        else void refreshCredits();
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : 'Couldn’t load this research');
      }
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [id]);

  const profile = research?.profile;
  const working = !error && (!research || research.status === 'working');
  const sent = research?.message ?? message;
  const editable = !!profile && research?.status !== 'working';
  const turns = research?.chat ?? [];

  useEffect(() => {
    chatEnd.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [turns.length, asking]);

  /** A hand edit: shown at once, then saved (one save at a time, in order) */
  const edit = (change: BrandEdit) => {
    if (!research || !editable) return;
    const { research: next, changed } = applyBrandEdit(research, change);
    if (!changed.length) return;
    const before = research;
    setEditError('');
    setResearch({ ...next, chat: noteHandEdit(next.chat, changed, new Date().toISOString()) });
    saving.current = saving.current.then(() =>
      editResearch(research.researchId, change).then(setResearch, (e: Error) => {
        setResearch(before);
        setEditError(`Couldn’t save that change: ${e.message}`);
      })
    );
  };

  /** A chat message: Zetca changes just the parts it asks about */
  const ask = async (text: string) => {
    const message = text.trim();
    if (!research || !message || asking) return;
    setAsking(message);
    setChatError('');
    setDraft('');
    try {
      await saving.current;
      setResearch(await chatAboutResearch(research.researchId, message));
    } catch (e) {
      setChatError(e instanceof Error ? e.message : 'Couldn’t send that');
      setDraft(message);
    } finally {
      setAsking(null);
      void refreshCredits();
    }
  };

  return (
    <div className="talk-dark relative isolate overflow-hidden rounded-[28px] bg-black text-white font-sans min-h-[calc(100dvh-140px)]">
      <TalkBackground dim />
      <style>{`
        /* The app colours text with --on-surface (dark); on this page it follows the parent's colour */
        .talk-dark { --on-surface: currentColor; }
        .talk-dot { font-family: "BubbledotICG-FinePos", "Geist Pixel Circle", ui-monospace, monospace; letter-spacing: -0.04em; }
        .talk-in { animation: talkIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
        @keyframes talkIn { from { opacity: 0; transform: translateY(10px); filter: blur(4px); } }
        @media (prefers-reduced-motion: reduce) { .talk-in { animation: none; } }
      `}</style>

      <div className="px-4 py-5 sm:px-7 sm:py-7">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/dashboard/strategist" aria-label="Back to Strategist" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
            <Icon icon="lucide:arrow-left" className="h-5 w-5" aria-hidden />
          </Link>
          <h1 className="talk-dot text-[clamp(22px,3vw,34px)] leading-none">Talk to Zetca</h1>
          {profile && <span className="talk-in rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">{profile.brandName}</span>}
        </div>

        {research && <Progress steps={research.steps} />}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_360px]">
          <div className="order-2 space-y-5 lg:order-1" aria-busy={working}>
            {editable && (
              <p className="flex items-center gap-1.5 text-xs text-white/50">
                <Icon icon="lucide:pencil" className="h-3.5 w-3.5" aria-hidden /> Click anything below to change it, or ask Zetca in the chat.
              </p>
            )}
            {editError && (
              <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-500/20 px-4 py-2 text-sm text-red-100">
                {editError}
              </p>
            )}
            <Board research={research} onResearch={setResearch} editable={editable} onEdit={edit} />
          </div>

          {/* The conversation */}
          <aside className={`${GLASS} order-1 flex flex-col gap-3 p-4 lg:order-2 lg:sticky lg:top-[96px] lg:max-h-[calc(100dvh-120px)] lg:overflow-y-auto`} aria-label="Conversation">
            {sent && <Bubble from="user">{sent}</Bubble>}
            <Bubble from="zetca">On it. I’ll study your brand and a few like it. About two minutes.</Bubble>
            {error && <Bubble from="zetca" tone="error">{error}</Bubble>}
            {research?.status === 'failed' && research.error && <Bubble from="zetca" tone="error">{research.error}</Bubble>}
            {working && (
              <p role="status" className="flex items-center gap-2 px-1 text-sm text-white/60">
                <Icon icon="lucide:loader-circle" className="h-4 w-4 animate-spin" aria-hidden /> {research?.steps.find((s) => s.status === 'working')?.label ?? 'Starting'}…
              </p>
            )}
            {profile && research?.status === 'done' && (
              <>
                <Bubble from="zetca">
                  Here’s <strong>{profile.brandName}</strong> at a glance{research.competitors.length ? `, next to ${research.competitors.length} brands like you` : ''}.
                </Bubble>
                {research.comparison?.gap && (
                  <Bubble from="zetca">
                    <span className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Your edge</span>
                    {research.comparison.gap}
                  </Bubble>
                )}
                {profile.missing.length > 0 && (
                  <Bubble from="zetca">
                    <span className="block text-white/60 text-xs font-semibold uppercase tracking-wider">Quick questions</span>
                    <ul className="mt-1 space-y-1">
                      {profile.missing.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </Bubble>
                )}
                {turns.map((t, i) => (
                  <Turn key={`${t.at}-${i}`} turn={t} />
                ))}
                {asking && (
                  <>
                    <Bubble from="user">{asking}</Bubble>
                    <p role="status" className="flex items-center gap-2 px-1 text-sm text-white/60">
                      <Icon icon="lucide:loader-circle" className="h-4 w-4 animate-spin" aria-hidden /> Updating your brand…
                    </p>
                  </>
                )}
                {chatError && (
                  <Bubble from="zetca" tone="error">
                    {chatError}
                  </Bubble>
                )}
                <div ref={chatEnd} />
                <form
                  className="rounded-2xl border border-white/15 bg-white/[0.06] p-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void ask(draft);
                  }}
                >
                  <label htmlFor="brand-chat" className="sr-only">
                    Ask Zetca to change something
                  </label>
                  <textarea
                    id="brand-chat"
                    rows={2}
                    value={draft}
                    maxLength={2000}
                    disabled={!!asking}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void ask(draft);
                      }
                    }}
                    placeholder="Change something, or answer a question…"
                    className="w-full resize-none bg-transparent px-2 py-1 text-[14px] leading-6 text-white placeholder:text-white/40 outline-none disabled:opacity-60"
                  />
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="text-[11px] text-white/40">2 credits a message</span>
                    <button
                      type="submit"
                      disabled={!draft.trim() || !!asking}
                      aria-label="Send"
                      className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#0b0b0f] transition hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                    >
                      <Icon icon="lucide:arrow-up" className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </form>
                {!turns.some((t) => t.role === 'user') && !asking && (
                  <div className="flex flex-wrap gap-1.5" aria-label="Ideas">
                    {CHAT_IDEAS.map((idea) => (
                      <button key={idea} type="button" onClick={() => setDraft(idea)} className="rounded-full border border-white/15 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10">
                        {idea}
                      </button>
                    ))}
                  </div>
                )}
                <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-3 text-sm">
                  <p className="font-semibold">Next: your plan</p>
                  <p className="mt-0.5 text-white/60">Posts, visuals and a schedule from this. Coming next.</p>
                  <Link href="/dashboard/strategist/new" className="mt-2 inline-block font-semibold text-indigo-300 hover:text-indigo-200">
                    Build it step by step now →
                  </Link>
                </div>
              </>
            )}
            {research && research.status !== 'working' && (
              <Link href="/dashboard/strategist" className="inline-flex items-center gap-1.5 self-start rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
                <Icon icon="lucide:message-square-plus" className="h-4 w-4" aria-hidden /> New conversation
              </Link>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function Bubble({ from, tone, children }: { from: 'user' | 'zetca'; tone?: 'error'; children: React.ReactNode }) {
  if (from === 'user') {
    return <div className="talk-in self-end max-w-[92%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-white px-4 py-3 text-[14px] leading-6 text-[#0b0b0f]">{children}</div>;
  }
  return (
    <div className="talk-in flex max-w-[96%] items-start gap-2">
      <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#0b0b0f]" aria-hidden>
        <Icon icon="lucide:box" className="h-4 w-4" />
      </span>
      <div className={`rounded-3xl rounded-tl-lg px-4 py-3 text-[14px] leading-6 ${tone === 'error' ? 'bg-red-500/20 text-red-100 border border-red-400/30' : 'bg-white/10 text-white'}`}>{children}</div>
    </div>
  );
}

/** A line of the chat after the research */
function Turn({ turn }: { turn: ChatTurn }) {
  if (turn.role === 'edit') {
    return (
      <p className="flex items-center justify-center gap-1.5 px-2 text-center text-xs text-white/45">
        <Icon icon="lucide:pencil" className="h-3 w-3 shrink-0" aria-hidden /> {turn.text}
      </p>
    );
  }
  if (turn.role === 'user') return <Bubble from="user">{turn.text}</Bubble>;
  return (
    <Bubble from="zetca">
      {turn.text}
      {turn.changed && turn.changed.length > 0 && (
        <span className="mt-1 flex items-center gap-1 text-xs text-emerald-200/80">
          <Icon icon="lucide:check" className="h-3 w-3" aria-hidden /> Updated {listOf(turn.changed.map((f) => FIELD_LABELS[f]))}
        </span>
      )}
    </Bubble>
  );
}

const STEP_ICON: Record<ResearchStep['status'], string> = {
  waiting: 'lucide:circle-dashed',
  working: 'lucide:loader-circle',
  done: 'lucide:circle-check',
  skipped: 'lucide:circle-minus',
  failed: 'lucide:circle-alert',
};

function Progress({ steps }: { steps: ResearchStep[] }) {
  return (
    <ol className="mt-5 flex flex-wrap gap-2" aria-label="Progress">
      {steps.map((s) => (
        <li
          key={s.id}
          title={s.detail}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            s.status === 'done'
              ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200'
              : s.status === 'working'
                ? 'border-white/30 bg-white/15 text-white'
                : s.status === 'failed'
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                  : 'border-white/10 bg-white/[0.04] text-white/40'
          }`}
        >
          <Icon icon={STEP_ICON[s.status]} className={`h-3.5 w-3.5 ${s.status === 'working' ? 'animate-spin' : ''}`} aria-hidden />
          {s.label}
        </li>
      ))}
    </ol>
  );
}

/** What Zetca found: visual first */
function Board({
  research,
  onResearch,
  editable,
  onEdit,
}: {
  research: PublicBrandResearch | null;
  onResearch: (r: PublicBrandResearch) => void;
  editable: boolean;
  onEdit: (change: BrandEdit) => void;
}) {
  if (!research) return <Shimmer />;
  const { profile, media, chips, socials, competitors, comparison } = research;
  const kit = profile?.brandKit;
  const fonts = [kit?.headingFont, kit?.bodyFont].filter(Boolean) as string[];
  return (
    <>
      {fonts.length > 0 && <link rel="stylesheet" href={googleFontsHref(fonts)} precedence="default" />}

      {/* The brand, like a profile card */}
      {profile ? (
        <section className={`${CARD} talk-in p-5`} aria-label="Your brand">
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
              {kit?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={kit.logoUrl} alt={`${profile.brandName} logo`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl font-bold text-[#0b0b0f]">{profile.brandName.slice(0, 1)}</span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <EditableText
                as="h2"
                label="brand name"
                value={profile.brandName}
                maxLength={80}
                editable={editable}
                onSave={(brandName) => onEdit({ brandName })}
                className="block text-[clamp(22px,2.6vw,30px)] font-bold leading-tight"
                style={kit?.headingFont ? { fontFamily: `"${kit.headingFont}", serif` } : undefined}
              />
              <EditableText
                as="p"
                label="tagline"
                value={profile.tagline}
                editable={editable}
                onSave={(tagline) => onEdit({ tagline })}
                className="block text-[15px] text-[#464555]"
              />
            </div>
            <Platforms socials={socials} />
          </div>
          {(chips.length > 0 || editable) && (
            <EditableChips items={chips} label="specialty" editable={editable} onSave={(specialties) => onEdit({ specialties })} className="mt-4" />
          )}
        </section>
      ) : (
        chips.length > 0 && <Chips items={chips} className="talk-in" onDark />
      )}

      {/* Photos and videos */}
      {media.images.length + media.videos.length > 0 ? <Mosaic images={media.images} videos={media.videos} /> : research.status === 'working' && <Shimmer />}

      {/* The brand kit and who it's for */}
      {profile && kit && (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={`${CARD} talk-in p-5 md:col-span-2`} aria-label="Colours">
            <p className={LABEL}>Colours</p>
            <ColorsEditor colors={kit.colors} editable={editable} onSave={(colors) => onEdit({ colors })} />
          </section>
          {(fonts.length > 0 || editable) && (
            <section className={`${CARD} talk-in p-5`} aria-label="Fonts">
              <p className={LABEL}>Fonts</p>
              <div className="mt-3 flex items-end gap-6">
                <FontPicker role="Heading" size="text-5xl" font={kit.headingFont} editable={editable} onSave={(headingFont) => onEdit({ headingFont })} />
                <FontPicker role="Body" size="text-2xl" font={kit.bodyFont} editable={editable} onSave={(bodyFont) => onEdit({ bodyFont })} />
              </div>
            </section>
          )}
          <section className={`${CARD} talk-in p-5 space-y-4 ${fonts.length || editable ? '' : 'md:col-span-2'}`} aria-label="Who it's for">
            <TagRow label="Customers" icon="lucide:users" items={profile.audience} editable={editable} onSave={(audience) => onEdit({ audience })} />
            <TagRow label="How you sound" icon="lucide:message-circle" items={profile.voice} editable={editable} onSave={(voice) => onEdit({ voice })} />
            <TagRow label="Your look" icon="lucide:camera" items={kit.look} editable={editable} onSave={(look) => onEdit({ look })} />
          </section>
        </div>
      )}

      {/* Brands like yours */}
      {competitors.length > 0 && profile && (
        <section className="talk-in space-y-3" aria-label="Brands like yours">
          <h2 className="talk-dot text-[clamp(18px,2.2vw,26px)] leading-none">Brands like yours</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <BrandCard
              you
              name={profile.brandName}
              logo={kit?.logoUrl}
              cover={media.images[0]?.url}
              colors={kit?.colors.map((c) => c.hex) ?? []}
              line={comparison?.positioning ?? profile.tagline}
              tags={profile.strengths}
              socials={socials}
              thumbs={media.images.slice(1, 4)}
            />
            {competitors.map((c) => (
              <CompetitorCard key={c.name} c={c} />
            ))}
          </div>
        </section>
      )}
      {research.steps.find((s) => s.id === 'competitors')?.status === 'working' && <Shimmer tall />}

      {/* What works for them */}
      {comparison && comparison.whatWorks.length > 0 && (
        <section className="talk-in space-y-3" aria-label="What works for them">
          <h2 className="talk-dot text-[clamp(18px,2.2vw,26px)] leading-none">What works for them</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {comparison.whatWorks.map((w) => {
              const by = competitors.find((c) => c.name.toLowerCase() === w.competitor.toLowerCase());
              const photo = by?.media.images[0]?.url;
              return (
                <a key={w.title} href={w.source} target="_blank" rel="noopener noreferrer" className={`${CARD} group overflow-hidden`}>
                  <div className="relative h-32 bg-[#0b1c30]/5">
                    {photo && <Photo src={photo} alt="" className="h-full w-full object-cover opacity-80 transition group-hover:opacity-100" />}
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white">{w.competitor}</span>
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{w.title}</p>
                    <p className="mt-1 text-sm text-[#464555]">{w.detail}</p>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Your positioning, in the brand's own colours */}
      {comparison && kit && (
        <section
          className="talk-in rounded-3xl p-6 sm:p-8"
          style={{ background: kit.colors[0]?.hex ?? '#ffffff', color: inkOn(kit.colors[0]?.hex ?? '#ffffff') }}
          aria-label="Your positioning"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-60">Your positioning</p>
          <EditableText
            as="p"
            label="positioning"
            value={comparison.positioning}
            editable={editable}
            onSave={(positioning) => onEdit({ positioning })}
            className="mt-2 block text-[clamp(22px,3vw,36px)] font-bold leading-tight"
            style={kit.headingFont && !SCRIPT_FONT.test(kit.headingFont) ? { fontFamily: `"${kit.headingFont}", serif` } : undefined}
          />
        </section>
      )}

      {/* The campaign looks Zetca suggests for this brand */}
      {research.status === 'done' && <SuggestedStyles research={research} onResearch={onResearch} />}

      {/* Sources, folded away */}
      {profile && profile.facts.length > 0 && (
        <details className={`${CARD} p-4 text-sm`}>
          <summary className="cursor-pointer font-semibold">Where this came from</summary>
          <ul className="mt-3 space-y-2">
            {profile.facts.map((f, i) => (
              <li key={i} className="text-[#464555]">
                {f.text} <SourceChip url={f.source} />
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function Shimmer({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-2 ${tall ? '' : ''}`} aria-hidden>
      {Array.from({ length: tall ? 4 : 6 }).map((_, i) => (
        <div key={i} className={`${tall ? 'h-56' : 'h-32'} animate-pulse rounded-2xl bg-white/[0.07]`} style={{ animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

function Chips({ items, className = '', onDark = false }: { items: string[]; className?: string; onDark?: boolean }) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {items.map((c) => (
        <span key={c} className={`rounded-full border px-3 py-1 text-[13px] font-medium ${onDark ? 'border-white/15 bg-white/10' : 'border-[#0b1c30]/10 bg-[#f1f5f9]'}`}>
          {c}
        </span>
      ))}
    </div>
  );
}

function TagRow({ label, icon, items, editable, onSave }: { label: string; icon: string; items: string[]; editable: boolean; onSave: (next: string[]) => void }) {
  if (!items.length && !editable) return null;
  return (
    <div>
      <p className={`${LABEL} flex items-center gap-1.5`}>
        <Icon icon={icon} className="h-3.5 w-3.5" aria-hidden /> {label}
      </p>
      <EditableChips items={items} label={label.toLowerCase()} max={6} editable={editable} onSave={onSave} className="mt-2" />
    </div>
  );
}

function Platforms({ socials, small = false }: { socials: Socials; small?: boolean }) {
  const list = Object.entries(socials) as [string, string][];
  if (!list.length) return null;
  return (
    <div className="flex gap-1.5">
      {list.map(([p, url]) => (
        <a
          key={p}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={p}
          className={`grid place-items-center rounded-full bg-[#0b1c30] text-white hover:scale-105 transition ${small ? 'h-7 w-7' : 'h-9 w-9'}`}
        >
          <Icon icon={SOCIAL_ICONS[p] ?? 'lucide:link'} className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden />
        </a>
      ))}
    </div>
  );
}

function SourceChip({ url }: { url: string }) {
  if (!/^https?:/.test(url)) return <span className="ml-1 rounded-full bg-[#0b1c30]/5 px-2 py-0.5 text-[11px] text-[#64748b]">{url}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#0b1c30]/5 px-2 py-0.5 text-[11px] text-[#64748b] hover:text-[#0b1c30]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://www.google.com/s2/favicons?domain=${hostOf(url)}&sz=32`} alt="" className="h-3 w-3 rounded-sm" referrerPolicy="no-referrer" />
      {hostOf(url)}
    </a>
  );
}

/** An image from another site; hides itself if that site won't serve it */
function Photo({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={className} />;
}

function Mosaic({ images, videos }: { images: MediaImage[]; videos: MediaVideo[] }) {
  const tiles = [...images.slice(0, 8).map((i) => ({ kind: 'image' as const, i })), ...videos.slice(0, 3).map((v) => ({ kind: 'video' as const, v }))];
  return (
    <section className="talk-in" aria-label="Photos and videos">
      <div className="grid auto-rows-[120px] grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t, n) =>
          t.kind === 'image' ? (
            <a
              key={t.i.url}
              href={t.i.source}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative overflow-hidden rounded-2xl bg-white/5 ${n === 0 ? 'col-span-2 row-span-2' : ''}`}
              title={t.i.caption}
            >
              <Photo src={t.i.url} alt={t.i.caption ?? ''} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white/80">{hostOf(t.i.source)}</span>
            </a>
          ) : (
            <a key={t.v.url} href={t.v.url} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-2xl bg-white/10">
              {t.v.thumbnail ? <Photo src={t.v.thumbnail} alt="" className="h-full w-full object-cover opacity-80" /> : null}
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#0b0b0f] transition group-hover:scale-110">
                  <Icon icon="lucide:play" className="h-5 w-5 translate-x-[1px]" aria-hidden />
                </span>
              </span>
              <Icon icon={VIDEO_ICONS[t.v.platform]} className="absolute bottom-2 left-2 h-4 w-4 text-white" aria-hidden />
            </a>
          )
        )}
      </div>
    </section>
  );
}

function BrandCard({
  you = false,
  name,
  logo,
  cover,
  colors,
  line,
  tags,
  socials,
  thumbs,
  site,
}: {
  you?: boolean;
  name: string;
  logo?: string;
  cover?: string;
  colors: string[];
  line?: string;
  tags: string[];
  socials: Socials;
  thumbs: MediaImage[];
  site?: string;
}) {
  return (
    <article className={`${CARD} talk-in flex flex-col overflow-hidden ${you ? 'ring-2 ring-white/70' : ''}`}>
      <div className="relative h-28 bg-gradient-to-br from-[#0b1c30]/10 to-[#0b1c30]/[0.02]">
        {cover && <Photo src={cover} alt="" className="h-full w-full object-cover" />}
        {you && <span className="absolute right-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#0b0b0f]">You</span>}
        <span className="absolute -bottom-6 left-4 grid h-12 w-12 place-items-center overflow-hidden rounded-full border-2 border-black bg-white">
          {logo ? <Photo src={logo} alt="" className="h-full w-full object-cover" /> : <span className="font-bold text-[#0b0b0f]">{name.slice(0, 1)}</span>}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 pt-8">
        <div>
          <p className="font-semibold leading-tight">{name}</p>
          {site && <SourceChip url={site} />}
        </div>
        {colors.length > 0 && (
          <div className="flex gap-1" aria-label="Colours">
            {colors.slice(0, 5).map((c) => (
              <span key={c} className="h-4 w-4 rounded-full border border-black/10" style={{ background: c }} />
            ))}
          </div>
        )}
        {line && <p className="text-sm text-[#464555]">{line}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-[#0b1c30]/5 px-2 py-0.5 text-[11px]">
                {t}
              </span>
            ))}
          </div>
        )}
        {thumbs.length > 0 && (
          <div className="mt-auto grid grid-cols-3 gap-1.5">
            {thumbs.slice(0, 3).map((t) => (
              <div key={t.url} className="aspect-square overflow-hidden rounded-lg bg-[#0b1c30]/5">
                <Photo src={t.url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}
        <Platforms socials={socials} small />
      </div>
    </article>
  );
}

function CompetitorCard({ c }: { c: CompetitorFound }) {
  return (
    <BrandCard
      name={c.name}
      logo={c.logoUrl}
      cover={c.media.images[0]?.url}
      colors={c.colors}
      line={c.positioning ?? c.why}
      tags={[...(c.contentStyle ?? []), ...(c.offers ?? [])]}
      socials={c.socials}
      thumbs={c.media.images.slice(1, 4)}
      site={c.website}
    />
  );
}

export type { BrandProfile };
