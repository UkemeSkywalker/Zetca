'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { useSpeech } from './useSpeech';

const VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4';
const DISPLAY_FONT = 'https://db.onlinewebfonts.com/c/8cb707a9b8a73f8a7403336b861c3074?family=BubbledotICG-FinePos';

const PLATFORMS = ['simple-icons:instagram', 'simple-icons:tiktok', 'simple-icons:linkedin', 'simple-icons:youtube'];

const EXAMPLES = ['Grow my bakery’s Instagram', 'Get more leads for my agency', 'Launch my new clothing line'];

const STATS = [
  { glyph: '<', target: 1, decimals: 0, prefix: '~', suffix: ' min', label: 'To study your brand' },
  { glyph: '#', target: 3, decimals: 0, prefix: '', suffix: '', label: 'Competitors compared' },
  { glyph: '%', target: 6, decimals: 0, prefix: '', suffix: '', label: 'Platforms planned' },
  { glyph: '*', target: 24, decimals: 0, prefix: '', suffix: '/7', label: 'Posting on schedule' },
];

/**
 * The video streams from CloudFront (about 13 MB), so it's skipped for people
 * on data saver or a slow connection and for those who turned off motion.
 */
function videoWanted(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (c?.saveData || (c?.effectiveType && /(^|-)2g$/.test(c.effectiveType))) return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
const noSubscribe = () => () => {};

/** Keeps what the user typed so the chat page can pick it up */
export const PENDING_PROMPT_KEY = 'zetca:talk:prompt';

/**
 * The top of the Strategist: tell Zetca what you're trying to do (typed or
 * spoken, with links), and it researches the brand and builds the plan. The
 * quiz and the form stay below it.
 */
export function TalkToZetca() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [link, setLink] = useState('');
  const box = useRef<HTMLTextAreaElement>(null);
  const showVideo = useSyncExternalStore(noSubscribe, videoWanted, () => false);
  const [videoReady, setVideoReady] = useState(false);
  const speech = useSpeech((heard) => setText((t) => (t ? `${t.trimEnd()} ${heard}` : heard)));

  const addLink = () => {
    const url = link.trim();
    if (!url) return;
    setText((t) => `${t.trimEnd()}${t.trim() ? ' ' : ''}${url} `);
    setLink('');
    setLinkOpen(false);
    box.current?.focus();
  };

  const send = (message = text) => {
    const m = message.trim();
    if (!m) return;
    speech.stop();
    try {
      sessionStorage.setItem(PENDING_PROMPT_KEY, m);
    } catch {
      // Private windows: the chat page asks again
    }
    router.push('/dashboard/strategist/chat');
  };

  return (
    <section aria-labelledby="talk-title" className="talk relative isolate overflow-hidden rounded-[28px] bg-black text-white">
      <link rel="stylesheet" href={DISPLAY_FONT} precedence="default" />
      {/* While the video loads (or when it's skipped): a dark glow in its colours */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_70%,#3b2a4a_0%,#14101c_55%,#000_100%)]" aria-hidden />
      {showVideo && (
        <video
          className={`pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setVideoReady(true)}
          aria-hidden
        >
          <source src={VIDEO} type="video/mp4" />
        </video>
      )}
      {/* Keeps the words readable over the brightest parts of the video */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_45%,rgba(0,0,0,0.15),rgba(0,0,0,0.55)_70%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/5 bg-gradient-to-t from-black via-black/70 to-transparent" aria-hidden />

      <div className="flex min-h-[min(760px,calc(100dvh-150px))] flex-col items-center px-4 pb-6 pt-10 sm:px-8 sm:pt-14">
        <div className="flex flex-1 flex-col items-center justify-center text-center w-full max-w-[900px]">
          {/* Platforms row */}
          <div className="talk-anim mb-[clamp(16px,2.5vh,26px)] inline-flex items-center" style={{ ['--d' as string]: '0.05s' }}>
            {PLATFORMS.map((icon, i) => (
              <span
                key={icon}
                className="talk-ring grid place-items-center rounded-full border border-white/40 bg-[#28282a] p-[5px]"
                style={{ marginLeft: i ? 'calc(var(--ring) * -0.42)' : 0, zIndex: i + 1 }}
              >
                <span className="grid h-full w-full place-items-center rounded-full bg-white text-[#111]">
                  <Icon icon={icon} className="h-[42%] w-[42%]" aria-hidden />
                </span>
              </span>
            ))}
            <span
              className="talk-ring-pill inline-flex items-center whitespace-nowrap rounded-full border border-white/40 bg-[#28282a] pr-4 text-[clamp(12px,1.4vw,13.5px)] font-medium text-[#c4c2c3]"
              style={{ zIndex: 0 }}
            >
              Studies your brand and competitors
            </span>
          </div>

          <h1 id="talk-title" className="talk-display font-normal text-white">
            <span className="talk-line text-inherit" style={{ animationDelay: '0.12s' }}>
              Tell Zetca
            </span>
            <span className="talk-line text-inherit" style={{ animationDelay: '0.3s' }}>
              What You&rsquo;re Building
            </span>
          </h1>

          <p
            className="talk-anim talk-sub mt-[clamp(14px,2.2vh,22px)] max-w-[min(540px,92%)] text-[clamp(15px,calc(1.55vw+2px),18px)] leading-[1.55] text-[#e4e4e4]"
            style={{ ['--d' as string]: '0.28s' }}
          >
            Say what you’re trying to do and paste a link to your website or socials. Zetca studies your brand and the competition, then builds your plan, posts and schedule.
          </p>

          {/* The chat box */}
          <form
            className="talk-anim mt-[clamp(18px,3vh,30px)] w-full max-w-[680px]"
            style={{ ['--d' as string]: '0.4s' }}
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <div
              className={`talk-box rounded-[26px] bg-white p-2.5 text-left text-[#0b1c30] transition-shadow ${speech.listening ? 'talk-box-listening' : ''}`}
            >
              <label htmlFor="talk-input" className="sr-only">
                Tell Zetca about your business
              </label>
              <textarea
                id="talk-input"
                ref={box}
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={speech.listening ? 'Listening… say what you’re building' : 'I run a bakery in Lagos and want more people ordering cakes online…'}
                className="block w-full resize-none bg-transparent px-3 pt-2 text-[15px] leading-6 placeholder:text-[#8e8e93] focus:outline-none"
              />
              {speech.interim && <p className="px-3 text-[15px] leading-6 text-[#8e8e93]">{speech.interim}</p>}
              {linkOpen && (
                <div className="mx-1 mt-2 flex items-center gap-2 rounded-xl bg-[#f4f4f6] px-3 py-2">
                  <Icon icon="lucide:link" className="h-4 w-4 shrink-0 text-[#6b6b73]" aria-hidden />
                  <label htmlFor="talk-link" className="sr-only">
                    Link to your website or social profile
                  </label>
                  <input
                    id="talk-link"
                    autoFocus
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLink();
                      }
                      if (e.key === 'Escape') setLinkOpen(false);
                    }}
                    placeholder="yourwebsite.com or instagram.com/yourbrand"
                    className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <button type="button" onClick={addLink} className="rounded-lg bg-[#0b0b0f] px-3 py-1 text-xs font-semibold text-white">
                    Add
                  </button>
                </div>
              )}
              <div className="mt-1.5 flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setLinkOpen((o) => !o)}
                  aria-expanded={linkOpen}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e4e4e8] px-3 text-[13px] font-medium text-[#3a3a40] hover:bg-[#f4f4f6]"
                >
                  <Icon icon="lucide:link" className="h-4 w-4" aria-hidden /> Add a link
                </button>
                <span className="flex-1" />
                {speech.supported && (
                  <button
                    type="button"
                    onClick={speech.listening ? speech.stop : speech.start}
                    aria-pressed={speech.listening}
                    aria-label={speech.listening ? 'Stop listening' : 'Speak instead of typing'}
                    title={speech.listening ? 'Stop listening' : 'Speak instead of typing'}
                    className={`relative grid h-11 w-11 place-items-center rounded-full transition-colors ${
                      speech.listening ? 'bg-[#4f46e5] text-white talk-mic-on' : 'bg-[#f1f1f4] text-[#0b1c30] hover:bg-[#e6e6ea]'
                    }`}
                  >
                    <Icon icon={speech.listening ? 'lucide:square' : 'lucide:mic'} className="h-5 w-5" aria-hidden />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!text.trim()}
                  aria-label="Send to Zetca"
                  className="grid h-11 w-11 place-items-center rounded-full bg-[#0b0b0f] text-white transition-transform hover:scale-105 disabled:bg-[#d4d4d8] disabled:hover:scale-100"
                >
                  <Icon icon="lucide:arrow-up" className="h-5 w-5" aria-hidden />
                </button>
              </div>
            </div>
            {speech.error && (
              <p role="alert" className="mt-2 text-sm text-amber-200">
                {speech.error}
              </p>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {EXAMPLES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setText(e);
                    box.current?.focus();
                  }}
                  className="rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-[13px] text-white/85 backdrop-blur-sm hover:bg-white/20"
                >
                  {e}
                </button>
              ))}
            </div>
          </form>
        </div>

        <Stats />
      </div>

      <style>{`
        .talk { --ring: clamp(34px, 4.5vw, 42px); font-family: var(--font-inter), "Inter", "Segoe UI", system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        .talk-display, .talk-sub { text-shadow: 0 1px 2px rgba(0,0,0,0.45), 0 0 24px rgba(0,0,0,0.35); }
        .talk-display { font-family: "BubbledotICG-FinePos", "Geist Pixel Circle", ui-monospace, monospace; font-size: clamp(28px, 5.6vw, 76px); line-height: 1.12; letter-spacing: -0.04em; }
        .talk-line { display: block; white-space: nowrap; opacity: 0; transform: translateY(14px); animation: talkHeadline 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .talk-ring { width: var(--ring); height: var(--ring); transition: transform 0.35s; }
        .talk-ring:hover { transform: translateY(-3px); }
        .talk-ring-pill { height: var(--ring); margin-left: calc(var(--ring) * -0.42); padding-left: calc(var(--ring) * 0.58); }
        .talk-anim { opacity: 0; transform: translateY(22px) scale(0.98); filter: blur(6px); animation: talkReveal 0.85s cubic-bezier(0.22, 1, 0.36, 1) forwards; animation-delay: var(--d, 0s); }
        .talk-box { box-shadow: 0 0 0 1px rgba(255,255,255,0.15), 0 0 22px rgba(255,255,255,0.28), 0 0 44px rgba(255,255,255,0.1); }
        .talk-box:focus-within { box-shadow: 0 0 0 1px rgba(255,255,255,0.3), 0 0 28px rgba(255,255,255,0.42), 0 0 60px rgba(255,255,255,0.16); }
        .talk-box-listening { box-shadow: 0 0 0 2px rgba(79,70,229,0.7), 0 0 30px rgba(129,140,248,0.55), 0 0 70px rgba(129,140,248,0.25); }
        .talk-mic-on::before, .talk-mic-on::after { content: ""; position: absolute; inset: -6px; border-radius: 999px; border: 2px solid rgba(79,70,229,0.45); animation: talkPulse 1.6s ease-out infinite; }
        .talk-mic-on::after { animation-delay: 0.8s; }
        @keyframes talkReveal { to { opacity: 1; transform: none; filter: none; } }
        @keyframes talkHeadline { to { opacity: 1; transform: none; } }
        @keyframes talkPulse { from { transform: scale(0.9); opacity: 1; } to { transform: scale(1.5); opacity: 0; } }
        @media (max-width: 720px) { .talk-display { letter-spacing: -0.08em; line-height: 1.05; font-size: clamp(24px, 6.6vw, 48px); } .talk-line { white-space: normal; } }
        @media (max-width: 420px) { .talk { --ring: 30px; } .talk-display { letter-spacing: -0.09em; line-height: 1.04; } .talk-ring-pill { font-size: 12px; padding-right: 12px; } }
        @media (prefers-reduced-motion: reduce) {
          .talk-line, .talk-anim { animation: none; opacity: 1; transform: none; filter: none; }
          .talk-mic-on::before, .talk-mic-on::after { animation: none; }
        }
      `}</style>
    </section>
  );
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** The four numbers at the bottom, counting up once they're on screen */
function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState(() => STATS.map(() => 0));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frames: number[] = [];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frames.push(requestAnimationFrame(() => setValues(STATS.map((s) => s.target))));
      return () => frames.forEach(cancelAnimationFrame);
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        STATS.forEach((s, i) => {
          timers.push(
            setTimeout(() => {
              const start = performance.now();
              const duration = 1500 + i * 80;
              const tick = (now: number) => {
                const t = Math.min(1, (now - start) / duration);
                setValues((v) => v.map((x, j) => (j === i ? s.target * easeOutCubic(t) : x)));
                if (t < 1) frames.push(requestAnimationFrame(tick));
              };
              frames.push(requestAnimationFrame(tick));
            }, 480 + i * 90)
          );
        });
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
      frames.forEach(cancelAnimationFrame);
    };
  }, []);

  return (
    <div ref={ref} className="mt-8 grid w-full max-w-[920px] grid-cols-2 gap-y-6 sm:grid-cols-4">
      {STATS.map((s, i) => (
        <div key={s.label} className="talk-anim flex flex-col items-center gap-1 text-center" style={{ ['--d' as string]: `${0.5 + i * 0.08}s` }}>
          <span className="talk-display !text-[clamp(22px,3vw,33px)] !leading-none text-white" aria-hidden>
            {s.glyph}
          </span>
          <span className="mt-1 text-[clamp(18px,2.2vw,26px)] font-normal tracking-[-0.025em] text-white tabular-nums">
            {s.prefix}
            {values[i].toFixed(s.decimals)}
            {s.suffix}
          </span>
          <span className="text-[clamp(11px,1.2vw,12.5px)] text-[#8e8e8e]">{s.label}</span>
        </div>
      ))}
    </div>
  );
}
