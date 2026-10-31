'use client';

import React, { useState, useSyncExternalStore } from 'react';

/** Talk to Zetca's look: the dark looping video, the dot-matrix display font */
export const TALK_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4';
export const DISPLAY_FONT = 'https://db.onlinewebfonts.com/c/8cb707a9b8a73f8a7403336b861c3074?family=BubbledotICG-FinePos';

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

/**
 * The video background, behind a parent with `relative isolate overflow-hidden`.
 * `dim` darkens it more for pages with lots to read.
 */
export function TalkBackground({ dim = false, fixed = false }: { dim?: boolean; fixed?: boolean }) {
  const showVideo = useSyncExternalStore(noSubscribe, videoWanted, () => false);
  const [ready, setReady] = useState(false);
  const pos = fixed ? 'fixed' : 'absolute';
  return (
    <>
      <link rel="stylesheet" href={DISPLAY_FONT} precedence="default" />
      {/* While the video loads (or when it's skipped): a dark glow in its colours */}
      <div className={`pointer-events-none ${pos} inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_70%,#3b2a4a_0%,#14101c_55%,#000_100%)]`} aria-hidden />
      {showVideo && (
        <video
          className={`pointer-events-none ${pos} inset-0 -z-10 h-full w-full object-cover transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onCanPlay={() => setReady(true)}
          aria-hidden
        >
          <source src={TALK_VIDEO} type="video/mp4" />
        </video>
      )}
      {dim && <div className={`pointer-events-none ${pos} inset-0 -z-10 bg-black/60`} aria-hidden />}
    </>
  );
}
