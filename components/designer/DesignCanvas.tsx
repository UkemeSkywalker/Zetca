'use client';

import React, { useEffect, useRef, useState } from 'react';
import { drawDesign } from '@/lib/design/render';
import { FORMATS, type DesignDoc } from '@/lib/design/types';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { usePhotoImages } from './photos';

/** Draws a design at full size and scales it to the width of its container */
export function DesignCanvas({ doc, className = '', label }: { doc: DesignDoc; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fontsReady, setFontsReady] = useState(false);
  const photos = usePhotoImages(doc);

  useEffect(() => {
    let live = true;
    loadDesignFonts().then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (ref.current) drawDesign(ref.current, doc, FONT_FAMILIES, photos);
  }, [doc, fontsReady, photos]);

  const { width, height } = FORMATS[doc.format];
  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      role="img"
      aria-label={label ?? designLabel(doc)}
      className={`block w-full h-auto ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
}

export function designLabel(doc: DesignDoc): string {
  const words = doc.layers.map((l) => l.text.replace(/\n/g, ' ')).filter(Boolean).join(' · ');
  return `Design: ${words || 'no text yet'}`;
}

/** A design thumbnail letterboxed into a fixed-shape frame */
export function DesignThumb({ doc, frame = 'portrait', className = '' }: { doc: DesignDoc; frame?: 'portrait' | 'square'; className?: string }) {
  const tall = FORMATS[doc.format].height / FORMATS[doc.format].width;
  const frameRatio = frame === 'portrait' ? 1.25 : 1;
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-surface-container-low ${frame === 'portrait' ? 'aspect-[4/5]' : 'aspect-square'} ${className}`}>
      <div style={{ width: tall > frameRatio ? `${(frameRatio / tall) * 100}%` : '100%' }}>
        <DesignCanvas doc={doc} />
      </div>
    </div>
  );
}
