'use client';

/**
 * Home hero: headline, then a curved row of creator reels that drifts left
 * and can be dragged. Spec: docs/design/home-hero-reels.md.
 *
 * Kept light: posters (~40 KB) show first; the Pexels clips (~0.6–1 MB each)
 * start only after the page has loaded, while the hero is on screen, and not
 * at all with reduced motion, Save-Data or a slow connection.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Caveat } from 'next/font/google';
import { cardOffsets, cardShape, roundedQuadPath } from '@/lib/home/reelGeometry';

const caveat = Caveat({ subsets: ['latin'], weight: ['600'] });

/** Free Pexels stock clips (Pexels licence: free for commercial use), loaded from Pexels' CDN */
interface VideoReel {
  kind: 'video';
  id: number;
  fps: number;
  poster: string;
  alt: string;
  video: string;
  posterUrl: string;
}

/** A text post drawn in the page: no download at all */
interface TextReel {
  kind: 'text';
  label: string;
  lines: string[];
  background: string;
}

type Reel = VideoReel | TextReel;

const video = (id: number, fps: number, poster: string, alt: string): VideoReel => ({
  kind: 'video',
  id,
  fps,
  poster,
  alt,
  video: `https://videos.pexels.com/video-files/${id}/${id}-sd_360_640_${fps}fps.mp4`,
  posterUrl: `https://images.pexels.com/videos/${id}/${poster}.jpeg?auto=compress&cs=tinysrgb&w=360`,
});

/** Creators, products, real estate, sport and text posts, mixed so neighbouring cards differ */
const REELS: Reel[] = [
  video(9384669, 24, 'adolescent-adult-beautiful-child-9384669', 'A creator setting up a phone and ring light'),
  { kind: 'text', label: 'LinkedIn post', lines: ['5 hooks that', 'stop the scroll', '↓ save this'], background: 'linear-gradient(160deg, #4F46E5, #7C3AED)' },
  video(7291758, 25, 'pexels-photo-7291758', 'Make-up being shown to camera'),
  video(8814190, 25, 'pexels-photo-8814190', 'An estate agent showing a house'),
  video(6390400, 25, 'pexels-photo-6390400', 'A woman working out'),
  video(6963730, 24, 'ceramic-cup-ceramic-vase-interior-decor-interior-decoration-6963730', 'Coffee being poured into a cup'),
  { kind: 'text', label: 'Just listed', lines: ['3-bed family', 'home with a', 'garden view'], background: 'linear-gradient(160deg, #0B1C30, #3730A3)' },
  video(13929655, 24, 'adult-brunette-computer-creativity-13929655', 'A creator recording at a laptop'),
  video(7646491, 25, 'buying-a-house-new-home-realtor-realty-7646491', 'A realtor opening the door for a family'),
  video(6801666, 30, '4k-4k-resolution-4k-video-aromatherapy-6801666', 'A serum bottle placed on a table'),
  video(8337359, 30, 'adolescent-adult-ball-basketball-8337359', 'A player posing with a basketball'),
  { kind: 'text', label: 'Day 12 of 30', lines: ['No-gym full', 'body workout', 'in 15 minutes'], background: 'linear-gradient(160deg, #6366F1, #EC4899)' },
];

/** Index of each video among the videos only (phones play just the first few) */
const VIDEO_ORDER = new Map(REELS.filter((r): r is VideoReel => r.kind === 'video').map((r, i) => [r.id, i]));

const CARD_COUNT = 14; // enough to fill very wide screens
const AUTO_SPEED = 50; // units per second, right → left
const PHONE_MAX = 820;
const PHONE_BAND = 250;
const PHONE_VIDEO_CLIPS = 4;

/** Text reels: their lines appear one after another, on a loop */
const TEXT_REEL_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .zetca-text-line { animation: zetca-line 6s ease-in-out infinite both; }
  @keyframes zetca-line {
    0%, 4% { opacity: 0; transform: translateY(10px); }
    12%, 86% { opacity: 1; transform: none; }
    96%, 100% { opacity: 0; transform: translateY(-6px); }
  }
}
`;

export function ReelHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const entranceRefs = useRef<Record<string, HTMLElement | SVGElement | null>>({});
  const [videosOn, setVideosOn] = useState(false);
  const [phone, setPhone] = useState(false);
  const [loaded, setLoaded] = useState<Record<number, boolean>>({});

  // Phone layout switch (the text layout itself is CSS; this is for the carousel and clips)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${PHONE_MAX}px)`);
    const apply = () => setPhone(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // The carousel: time-based drift, drag with momentum, geometry every frame
  useEffect(() => {
    const section = sectionRef.current;
    const band = bandRef.current;
    if (!section || !band) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let scroll = 0;
    let velocity = 0;
    let dragging = false;
    let lastX = 0;
    let lastMoveAt = 0;
    let visible = true;
    let raf = 0;
    let last = performance.now();

    const layout = () => {
      const isPhone = window.innerWidth <= PHONE_MAX;
      const bandW = band.clientWidth;
      const frameW = isPhone ? 640 : 1440;
      const unit = isPhone ? bandW / 640 : section.clientHeight / 1000;
      if (!unit) return { unit: 1 };
      const frameLeft = (bandW - frameW * unit) / 2;
      const centreY = isPhone ? PHONE_BAND / 2 / unit : 607;
      const offsets = cardOffsets(CARD_COUNT, scroll);
      offsets.forEach((t, i) => {
        const el = cardRefs.current[i];
        if (!el) return;
        const shape = cardShape(t, frameW, centreY);
        const x = frameLeft + shape.left * unit;
        const w = shape.width * unit;
        const video = videoRefs.current[i];
        if (x + w < -40 || x > bandW + 40) {
          if (el.style.visibility !== 'hidden') {
            el.style.visibility = 'hidden';
            video?.pause(); // no decoding for cards off screen
          }
          return;
        }
        if (el.style.visibility !== 'visible') {
          el.style.visibility = 'visible';
          if (video && document.visibilityState === 'visible') video.play().catch(() => {});
        }
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${(shape.top * unit).toFixed(1)}px, 0)`;
        el.style.width = `${w.toFixed(1)}px`;
        el.style.height = `${(shape.height * unit).toFixed(1)}px`;
        el.style.clipPath = roundedQuadPath(shape.points, 15, unit);
      });
      return { unit };
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!dragging) {
        scroll += ((reduced ? 0 : AUTO_SPEED) + velocity) * dt;
        velocity *= Math.pow(0.05, dt); // loses ~95% per second
        if (Math.abs(velocity) < 1) velocity = 0;
      }
      layout();
      raf = visible ? requestAnimationFrame(tick) : 0;
    };

    const start = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      velocity = 0;
      lastX = e.clientX;
      lastMoveAt = performance.now();
      band.setPointerCapture(e.pointerId);
      band.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const { unit } = layout();
      const now = performance.now();
      const dx = (e.clientX - lastX) / (unit || 1);
      const dt = Math.max(0.001, (now - lastMoveAt) / 1000);
      scroll -= dx; // drag left → content moves left
      velocity = -dx / dt;
      lastX = e.clientX;
      lastMoveAt = now;
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      // A pause before letting go means no fling
      if (performance.now() - lastMoveAt > 80) velocity = 0;
      velocity = Math.max(-3000, Math.min(3000, velocity));
      band.releasePointerCapture?.(e.pointerId);
      band.style.cursor = '';
    };
    band.addEventListener('pointerdown', onDown);
    band.addEventListener('pointermove', onMove);
    band.addEventListener('pointerup', onUp);
    band.addEventListener('pointercancel', onUp);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && document.visibilityState === 'visible';
      if (visible) start();
    });
    observer.observe(section);
    const onVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible) start();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const onResize = () => layout();
    window.addEventListener('resize', onResize);

    layout();
    start();
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', onResize);
      band.removeEventListener('pointerdown', onDown);
      band.removeEventListener('pointermove', onMove);
      band.removeEventListener('pointerup', onUp);
      band.removeEventListener('pointercancel', onUp);
    };
  }, []);

  // Clips start only once the page has loaded, the browser is idle, the hero is on screen and the connection is good
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (reduced || conn?.saveData || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? '')) return;
    let cancelled = false;
    const go = () => {
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      const run = () => !cancelled && setVideosOn(true);
      if (idle) idle(run, { timeout: 2000 });
      else setTimeout(run, 800);
    };
    if (document.readyState === 'complete') go();
    else window.addEventListener('load', go, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', go);
    };
  }, []);

  // Pause clips while the hero is off screen or the tab is hidden
  useEffect(() => {
    if (!videosOn) return;
    const section = sectionRef.current;
    if (!section) return;
    let onScreen = true;
    const sync = () => {
      const play = onScreen && document.visibilityState === 'visible';
      videoRefs.current.forEach((v, i) => {
        if (!v) return;
        if (play && cardRefs.current[i]?.style.visibility === 'visible') v.play().catch(() => {});
        else v.pause();
      });
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    observer.observe(section);
    document.addEventListener('visibilitychange', sync);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [videosOn]);

  // One-time entrance
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = entranceRefs.current;
    const ease = 'cubic-bezier(0.22, 1, 0.36, 1)';
    const run = (el: Element | null | undefined, frames: Keyframe[], delay: number, duration = 700) =>
      el?.animate(frames, { duration, delay, easing: ease, fill: 'backwards' });
    run(r.badge, [{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'scale(1)' }], 50, 500);
    run(r.line1, [{ opacity: 0, transform: 'translateY(24px)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], 150);
    run(r.line2, [{ opacity: 0, transform: 'translateY(24px)', filter: 'blur(10px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }], 260);
    run(r.sub, [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], 420);
    run(r.band, [{ opacity: 0, transform: 'translateY(60px)' }, { opacity: 1, transform: 'none' }], 520, 900);
    run(r.cta, [{ opacity: 0, transform: 'scale(0.9)' }, { opacity: 1, transform: 'scale(1)' }], 800, 500);
    run(r.notes, [{ opacity: 0 }, { opacity: 1 }], 1100, 600);
    entranceRefs.current.notes?.querySelectorAll<SVGPathElement>('path[data-draw]').forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      p.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 900, delay: 1100 + i * 150, easing: ease, fill: 'backwards' });
    });
  }, []);

  const set = (key: string) => (el: HTMLElement | SVGElement | null) => {
    entranceRefs.current[key] = el;
  };

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      className="relative overflow-hidden bg-[#F7F9FC] [--u:min(calc(100vw/1440),calc((100vh-80px)/1000))] h-[calc(var(--u)*1000)] min-h-[560px] max-[820px]:h-auto max-[820px]:min-h-0 max-[820px]:pt-10 max-[820px]:pb-12"
    >
      <style>{TEXT_REEL_CSS}</style>
      {/* Soft indigo glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] max-w-full h-[520px] pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] max-w-full h-[520px] bg-gradient-to-b from-[#EEF2FF] via-[#EEF2FF]/60 to-transparent rounded-full blur-3xl" />
      </div>

      {/* Copy */}
      <div className="relative z-10 text-center max-[820px]:px-5">
        <p
          ref={set('badge')}
          className="absolute left-0 right-0 mx-auto w-fit flex items-center gap-2 whitespace-nowrap rounded-full bg-[#EEF2FF] border border-indigo-100 font-semibold text-primary
            top-[calc(var(--u)*35)] px-[calc(var(--u)*16)] py-[calc(var(--u)*8)] text-[length:calc(var(--u)*16)]
            max-[820px]:static max-[820px]:px-3 max-[820px]:py-1.5 max-[820px]:text-xs max-[820px]:whitespace-normal"
        >
          <span className="w-[0.45em] h-[0.45em] rounded-full bg-primary" aria-hidden="true" />
          Your AI social media team
        </p>
        <h1
          id="hero-title"
          className="absolute left-0 right-0 font-heading font-extrabold text-[#0B1C30]
            top-[calc(var(--u)*96)] text-[length:calc(var(--u)*88)] leading-[calc(var(--u)*92)]
            max-[820px]:static max-[820px]:mt-5 max-[820px]:text-[length:clamp(38px,10.5vw,56px)] max-[820px]:leading-[1.05]"
        >
          <span ref={set('line1')} className="block tracking-[-0.035em]">
            Never run out of
          </span>
          <span ref={set('line2')} className="block tracking-[-0.022em] text-primary">
            things to post
          </span>
        </h1>
        <p
          ref={set('sub')}
          className="absolute left-0 right-0 mx-auto text-[#464555]
            top-[calc(var(--u)*314)] w-[calc(var(--u)*720)] text-[length:calc(var(--u)*20.8)] leading-[calc(var(--u)*32)]
            max-[820px]:static max-[820px]:w-auto max-[820px]:max-w-md max-[820px]:mx-auto max-[820px]:mt-4 max-[820px]:text-base max-[820px]:leading-relaxed"
        >
          Zetca plans your strategy, writes posts for every platform, schedules them and publishes for you. Design and video
          tools are coming soon.
        </p>
      </div>

      {/* The reel row */}
      <div
        ref={(el) => {
          bandRef.current = el;
          entranceRefs.current.band = el;
        }}
        className="absolute inset-0 cursor-grab select-none touch-pan-y max-[820px]:relative max-[820px]:inset-auto max-[820px]:mt-8 max-[820px]:h-[250px]"
        role="region"
        aria-label="Example reels and posts. Drag to scroll."
      >
        {Array.from({ length: CARD_COUNT }, (_, i) => {
          const reel = REELS[i % REELS.length];
          const playVideo =
            reel.kind === 'video' && videosOn && (!phone || (VIDEO_ORDER.get(reel.id) ?? 99) < PHONE_VIDEO_CLIPS);
          return (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 overflow-hidden bg-[#dfe3f5] will-change-transform [container-type:size]"
              style={{ visibility: 'hidden' }}
            >
              {reel.kind === 'text' ? (
                <div className="absolute inset-0 flex flex-col justify-center px-[9cqw] text-white" style={{ background: reel.background }}>
                  <span className="mb-[5cqw] self-start rounded-full bg-white/20 px-[5cqw] py-[1.5cqw] text-[length:6.5cqw] font-semibold">
                    {reel.label}
                  </span>
                  {reel.lines.map((line, n) => (
                    <span
                      key={line}
                      className="zetca-text-line block font-heading font-extrabold leading-[1.1] tracking-tight text-[length:12.5cqw]"
                      style={{ animationDelay: `${n * 0.35}s` }}
                    >
                      {line}
                    </span>
                  ))}
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={reel.posterUrl} alt={reel.alt} draggable={false} loading={i < 8 ? 'eager' : 'lazy'} className="absolute inset-0 w-full h-full object-cover" />
                  {playVideo && (
                    <video
                      ref={(el) => {
                        videoRefs.current[i] = el;
                      }}
                      src={reel.video}
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="auto"
                      aria-hidden="true"
                      onLoadedData={(e) => {
                        if (cardRefs.current[i]?.style.visibility !== 'visible') e.currentTarget.pause();
                        setLoaded((l) => (l[i] ? l : { ...l, [i]: true }));
                      }}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded[i] ? 'opacity-100' : 'opacity-0'}`}
                    />
                  )}
                </>
              )}
              {reel.kind === 'video' && (
                <span className="absolute left-2.5 bottom-2.5 w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 ml-0.5 text-white" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Call to action */}
      <div
        ref={set('cta')}
        className="absolute z-10 left-0 right-0 flex flex-col items-center top-[calc(var(--u)*821)]
          max-[820px]:static max-[820px]:mt-8"
      >
        <span className="rounded-full border-2 border-dashed border-primary/60 p-[calc(var(--u)*6)] max-[820px]:p-1.5">
          <Link
            href="/signup"
            className="block rounded-full bg-primary hover:bg-primary-700 text-white font-semibold shadow-lg shadow-indigo-300/50 transition-colors
              px-[calc(var(--u)*34)] py-[calc(var(--u)*17)] text-[length:calc(var(--u)*17)]
              max-[820px]:px-7 max-[820px]:py-3.5 max-[820px]:text-base"
          >
            Start planning posts
          </Link>
        </span>
        <span className="mt-[calc(var(--u)*10)] text-[length:calc(var(--u)*13)] text-[#777587] max-[820px]:mt-2 max-[820px]:text-xs">
          No card needed.
        </span>
        <span className={`${caveat.className} hidden max-[820px]:block mt-1 text-primary text-xl -rotate-6`}>Free plan ✦</span>
      </div>

      {/* Hand-drawn notes (desktop) */}
      <svg
        ref={set('notes')}
        viewBox="0 0 1440 1000"
        className="absolute z-10 left-1/2 -translate-x-1/2 top-0 w-[calc(var(--u)*1440)] h-[calc(var(--u)*1000)] pointer-events-none max-[820px]:hidden"
        aria-hidden="true"
      >
        <g fill="none" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {/* "//" doodle */}
          <path data-draw d="M268 292 L252 326" />
          <path data-draw d="M286 292 L270 326" />
          {/* arrow from "Write once" down to the cards */}
          <path data-draw d="M1212 318 C 1244 362, 1226 410, 1150 436" />
          <path data-draw d="M1166 424 L1148 437 L1168 446" />
          {/* arrow from "Free plan" to the button */}
          <path data-draw d="M548 872 C 566 884, 584 878, 594 862" />
          <path data-draw d="M581 862 L595 860 L595 875" />
        </g>
        <g className={caveat.className} fill="#4F46E5" fontWeight={600}>
          <text x="1150" y="246" fontSize="34" transform="rotate(12 1150 246)">
            <tspan x="1150">Write once,</tspan>
            <tspan x="1150" dy="34">post everywhere</tspan>
          </text>
          <text x="452" y="862" fontSize="32" transform="rotate(-10 452 862)">
            Free plan
          </text>
        </g>
      </svg>
    </section>
  );
}
