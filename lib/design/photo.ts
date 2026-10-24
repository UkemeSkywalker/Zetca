/**
 * Photo backgrounds: cropping a photo into the design, reading its tones,
 * and darkening it just enough for the text on top to be easy to read.
 */

import { passes, toHex } from './contrast';
import { backgroundColors, type DesignDoc, type PhotoBackground } from './types';

export interface DrawRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
}

/**
 * Where to draw a photo of `iw`×`ih` into a `W`×`H` design. "fill" crops it to
 * cover the design, keeping the focus point in view; "fit" shows all of it.
 */
export function photoRect(iw: number, ih: number, W: number, H: number, fit: 'fill' | 'fit', focusX = 0.5, focusY = 0.5): DrawRect {
  if (fit === 'fit') {
    const k = Math.min(W / iw, H / ih);
    const dw = iw * k;
    const dh = ih * k;
    return { sx: 0, sy: 0, sw: iw, sh: ih, dx: (W - dw) / 2, dy: (H - dh) / 2, dw, dh };
  }
  const k = Math.max(W / iw, H / ih);
  const sw = W / k;
  const sh = H / k;
  const sx = Math.min(Math.max(focusX * iw - sw / 2, 0), iw - sw);
  const sy = Math.min(Math.max(focusY * ih - sh / 2, 0), ih - sh);
  return { sx, sy, sw, sh, dx: 0, dy: 0, dw: W, dh: H };
}

/**
 * The average colour and the lightest tenth of a photo's pixels (RGBA data,
 * e.g. from a small copy of it). Text has to read against the light parts too.
 */
export function photoTones(data: Uint8ClampedArray): [string, string] {
  const px: [number, number, number, number][] = [];
  for (let i = 0; i + 3 < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    px.push([r, g, b, 0.2126 * r + 0.7152 * g + 0.0722 * b]);
  }
  if (!px.length) return ['#000000', '#000000'];
  const avg = (list: typeof px) =>
    toHex([0, 1, 2].map((c) => list.reduce((s, p) => s + p[c], 0) / list.length) as [number, number, number]);
  const light = [...px].sort((a, b) => b[3] - a[3]).slice(0, Math.max(1, Math.ceil(px.length / 10)));
  return [avg(px), avg(light)];
}

const MAX_OVERLAY = 0.8;

/**
 * Raises the overlay (adding a black one if there's none) until every text
 * layer reads against the photo. Leaves other backgrounds alone.
 */
export function readableOverlay(doc: DesignDoc): DesignDoc {
  if (doc.background.kind !== 'photo') return doc;
  const texts = doc.layers.filter((l) => l.text.trim() && !l.fill);
  let next: DesignDoc = { ...doc, overlay: doc.overlay ?? { color: '#000000', opacity: 0 } };
  const ok = (d: DesignDoc) => texts.every((l) => passes(l.color, backgroundColors(d)));
  while (!ok(next) && next.overlay!.opacity < MAX_OVERLAY) {
    next = { ...next, overlay: { ...next.overlay!, opacity: Math.min(MAX_OVERLAY, Math.round((next.overlay!.opacity + 0.05) * 100) / 100) } };
  }
  return next;
}

/** "Photo by stevepb on Pixabay" */
export function photoCredit(bg: PhotoBackground): string {
  if (bg.credit.source === 'ai') return 'Made with AI';
  return bg.credit.source === 'pixabay' ? `Photo by ${bg.credit.name} on Pixabay` : `Photo: ${bg.credit.name}`;
}
