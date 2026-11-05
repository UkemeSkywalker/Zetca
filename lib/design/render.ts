/**
 * Draws a design onto a 2D canvas at full size (1080 wide). The editor, the
 * thumbnails and the downloaded PNG all use this, so what you see is what you get.
 */

import { EXPORT_WIDTH, FORMATS, type DesignDoc, type FontId, type ImageLayer, type ShapeLayer, type TextLayer } from './types';
import { fitText, type FittedText } from './textFit';
import { photoRect } from './photo';

/** Loaded photos by photoId, for photo backgrounds */
export type PhotoImages = Record<string, CanvasImageSource & { width: number; height: number }>;

/** CSS font-family for each font (from next/font, so the names are hashed) */
export type FontFamilies = Record<FontId, string>;

type Ctx = CanvasRenderingContext2D;

export function fontString(layer: Pick<TextLayer, 'font' | 'weight'> & { italic?: boolean }, size: number, families: FontFamilies): string {
  // Display fonts only come in one weight; asking for another would make the browser fake bold
  const weight = layer.font === 'jakarta' ? layer.weight : 400;
  // Only the sans has real italics; others stay upright rather than fake-slanted
  const italic = layer.italic && layer.font === 'jakarta' ? 'italic ' : '';
  return `${italic}${weight} ${size}px ${families[layer.font]}`;
}

function setLetterSpacing(ctx: Ctx, px: number) {
  // Supported in current Chrome, Edge, Firefox and Safari; ignored elsewhere
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

/** Where each layer's text ended up, for the editor's selection boxes */
export interface LaidOutLayer {
  id: string;
  fitted: FittedText;
}

export function layoutLayer(ctx: Ctx, layer: TextLayer, families: FontFamilies): FittedText {
  const text = layer.uppercase ? layer.text.toUpperCase() : layer.text;
  const pad = layer.fill ? padding(layer.size) : 0;
  const measure = (t: string, size: number) => {
    ctx.font = fontString(layer, size, families);
    setLetterSpacing(ctx, layer.letterSpacing * size);
    // Slanted marked words run a little wider; leave them room
    return ctx.measureText(t).width * (layer.marks?.some((m) => m.italic) ? 1.04 : 1);
  };
  return fitText(
    text,
    { maxSize: layer.size, width: layer.width - pad * 2, height: layer.height - pad, lineHeight: layer.lineHeight },
    measure
  );
}

const padding = (size: number) => Math.round(size * 0.55);

function drawBackground(ctx: Ctx, doc: DesignDoc, w: number, h: number, photos: PhotoImages, overlayOnly = false) {
  const bg = doc.background;
  if (overlayOnly) {
    // For a video: just the dark wash, so the video shows through it
    if (doc.overlay && doc.overlay.opacity > 0) {
      ctx.globalAlpha = doc.overlay.opacity;
      ctx.fillStyle = doc.overlay.color;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    return;
  }
  if (bg.kind === 'solid') {
    ctx.fillStyle = bg.color;
  } else if (bg.kind === 'photo') {
    // The photo's average colour shows while it loads, and around it in "fit"
    ctx.fillStyle = bg.tones[0];
  } else {
    // A gradient line through the centre at `angle` (0 = bottom to top, like CSS)
    const rad = ((bg.angle - 90) * Math.PI) / 180;
    const half = (Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad))) / 2;
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createLinearGradient(cx - Math.cos(rad) * half, cy - Math.sin(rad) * half, cx + Math.cos(rad) * half, cy + Math.sin(rad) * half);
    g.addColorStop(0, bg.from);
    g.addColorStop(1, bg.to);
    ctx.fillStyle = g;
  }
  ctx.fillRect(0, 0, w, h);
  const image = bg.kind === 'photo' ? photos[bg.photoId] : undefined;
  if (bg.kind === 'photo' && image) {
    const r = photoRect(image.width, image.height, w, h, bg.fit, bg.focusX, bg.focusY);
    ctx.drawImage(image, r.sx, r.sy, r.sw, r.sh, r.dx, r.dy, r.dw, r.dh);
  }
  if (doc.overlay && doc.overlay.opacity > 0) {
    ctx.globalAlpha = doc.overlay.opacity;
    ctx.fillStyle = doc.overlay.color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawLayer(ctx: Ctx, layer: TextLayer, fitted: FittedText, families: FontFamilies) {
  if (!layer.text.trim()) return;
  const { size, lines } = fitted;
  ctx.font = fontString(layer, size, families);
  setLetterSpacing(ctx, layer.letterSpacing * size);
  ctx.textBaseline = 'alphabetic';
  const lineH = size * layer.lineHeight;
  const pad = layer.fill ? padding(size) : 0;
  const widths = lines.map((l) => ctx.measureText(l).width);
  const blockW = Math.max(...widths) + pad * 2;
  const blockH = fitted.height + (layer.fill ? pad : 0);

  const top =
    layer.valign === 'middle' ? layer.y + (layer.height - blockH) / 2 : layer.valign === 'bottom' ? layer.y + layer.height - blockH : layer.y;
  const left =
    layer.align === 'center' ? layer.x + (layer.width - blockW) / 2 : layer.align === 'right' ? layer.x + layer.width - blockW : layer.x;

  if (layer.fill) {
    ctx.fillStyle = layer.fill;
    roundRect(ctx, left, top, blockW, blockH, Math.min(blockH / 2, size));
    ctx.fill();
  }

  ctx.fillStyle = layer.color;
  ctx.textAlign = layer.align;
  const anchorX = layer.align === 'center' ? left + blockW / 2 : layer.align === 'right' ? left + blockW - pad : left + pad;
  // Put the cap height in the middle of each line box
  const baselineOffset = (lineH + size * 0.7) / 2;
  if (!layer.marks?.length) {
    lines.forEach((line, i) => ctx.fillText(line, anchorX, top + pad / 2 + i * lineH + baselineOffset));
    return;
  }
  // Some words look different: draw each line word by word from its left edge
  ctx.textAlign = 'left';
  let index = 0;
  lines.forEach((line, i) => {
    const words = line.split(' ').filter(Boolean);
    const y = top + pad / 2 + i * lineH + baselineOffset;
    const parts = words.map((word, k) => {
      const mark = layer.marks!.find((m) => index + k >= m.from && index + k < m.to);
      const font = fontString({ ...layer, italic: mark?.italic ?? layer.italic, weight: mark?.bold ? 800 : layer.weight }, size, families);
      ctx.font = font;
      return { word, mark, font, width: ctx.measureText(word).width };
    });
    ctx.font = fontString(layer, size, families);
    const space = ctx.measureText(' ').width;
    const lineW = parts.reduce((sum, p) => sum + p.width, 0) + space * Math.max(0, parts.length - 1);
    let x = layer.align === 'center' ? anchorX - lineW / 2 : layer.align === 'right' ? anchorX - lineW : anchorX;
    parts.forEach((p, k) => {
      ctx.font = p.font;
      ctx.fillStyle = p.mark?.color ?? layer.color;
      ctx.fillText(p.word, x, y);
      if (p.mark?.strike) {
        // A hand-drawn-looking line through the word, a little past both ends
        const next = parts[k + 1]?.mark === p.mark;
        ctx.strokeStyle = p.mark.strike;
        ctx.lineWidth = Math.max(3, size * 0.07);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x - size * 0.05, y - size * 0.3);
        ctx.lineTo(x + p.width + (next ? space : size * 0.08), y - size * 0.34);
        ctx.stroke();
      }
      x += p.width + space;
    });
    index += words.length;
  });
}

/* Flat shapes */

/** A path for a shape, at its box */
function shapePath(ctx: Ctx, s: ShapeLayer) {
  const { x, y, w, h } = s;
  const r = Math.min(s.radius ?? 0, w / 2, h / 2);
  ctx.beginPath();
  switch (s.kind) {
    case 'ellipse':
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      break;
    case 'bubble': {
      // A rounded box with a small pointed tail on one corner or side
      const t = Math.min(w, h) * 0.18;
      roundRectPath(ctx, x, y, w, h, r);
      const tail = s.tail ?? 'bl';
      ctx.moveTo(...tailPoints(tail, x, y, w, h, r, t)[0]);
      for (const p of tailPoints(tail, x, y, w, h, r, t).slice(1)) ctx.lineTo(...p);
      ctx.closePath();
      break;
    }
    case 'scallop': {
      // A box with a wavy edge made of little round bumps
      const bump = Math.max(18, Math.min(w, h) / 9);
      const along = (len: number) => Math.max(2, Math.round(len / (bump * 2)));
      const nx = along(w);
      const ny = along(h);
      const sx = w / nx;
      const sy = h / ny;
      ctx.moveTo(x, y);
      for (let i = 0; i < nx; i++) ctx.quadraticCurveTo(x + sx * (i + 0.5), y - bump * 0.7, x + sx * (i + 1), y);
      for (let i = 0; i < ny; i++) ctx.quadraticCurveTo(x + w + bump * 0.7, y + sy * (i + 0.5), x + w, y + sy * (i + 1));
      for (let i = nx; i > 0; i--) ctx.quadraticCurveTo(x + sx * (i - 0.5), y + h + bump * 0.7, x + sx * (i - 1), y + h);
      for (let i = ny; i > 0; i--) ctx.quadraticCurveTo(x - bump * 0.7, y + sy * (i - 0.5), x, y + sy * (i - 1));
      ctx.closePath();
      break;
    }
    case 'blob': {
      // A soft organic blob through 6 points around an ellipse
      const cx = x + w / 2;
      const cy = y + h / 2;
      const k = [1, 0.82, 0.96, 0.78, 1, 0.86];
      const pts = k.map((f, i) => {
        const a = (i / k.length) * Math.PI * 2;
        return [cx + Math.cos(a) * (w / 2) * f, cy + Math.sin(a) * (h / 2) * f] as const;
      });
      const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
      const start = mid(pts[pts.length - 1], pts[0]);
      ctx.moveTo(...start);
      pts.forEach((p, i) => ctx.quadraticCurveTo(p[0], p[1], ...mid(p, pts[(i + 1) % pts.length])));
      ctx.closePath();
      break;
    }
    case 'zigzag': {
      // A thick zigzag ribbon across the box
      const n = 3;
      const th = h * 0.32;
      const seg = w / (n * 2);
      ctx.moveTo(x, y + h - th);
      for (let i = 1; i <= n * 2; i++) ctx.lineTo(x + seg * i, i % 2 ? y : y + h - th);
      ctx.lineTo(x + w, y + th);
      for (let i = n * 2 - 1; i >= 0; i--) ctx.lineTo(x + seg * i, i % 2 ? y + th : y + h);
      ctx.closePath();
      break;
    }
    case 'steps': {
      // Stepped blocks, like a little podium behind a person
      const cw = w / 4;
      const levels = [0.55, 0.15, 0.3, 0.6];
      ctx.moveTo(x, y + h);
      levels.forEach((lv, i) => {
        ctx.lineTo(x + cw * i, y + h * lv);
        ctx.lineTo(x + cw * (i + 1), y + h * lv);
      });
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      break;
    }
    case 'ribbon': {
      // A flowing ribbon: a thick wave across the box
      ctx.moveTo(x, y + h * 0.7);
      ctx.bezierCurveTo(x + w * 0.3, y - h * 0.2, x + w * 0.55, y + h * 1.2, x + w, y + h * 0.15);
      break;
    }
    default:
      roundRectPath(ctx, x, y, w, h, r);
  }
}

function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The three points of a bubble's tail */
function tailPoints(tail: NonNullable<ShapeLayer['tail']>, x: number, y: number, w: number, h: number, r: number, t: number): [number, number][] {
  const inset = Math.max(r, t);
  switch (tail) {
    case 'br':
      return [[x + w - inset - t, y + h - 1], [x + w - inset * 0.4, y + h + t], [x + w - inset, y + h - 1]];
    case 'tl':
      return [[x + inset + t, y + 1], [x + inset * 0.4, y - t], [x + inset, y + 1]];
    case 'tr':
      return [[x + w - inset - t, y + 1], [x + w - inset * 0.4, y - t], [x + w - inset, y + 1]];
    case 'left':
      return [[x + 1, y + h / 2 - t], [x - t * 0.9, y + h / 2], [x + 1, y + h / 2 + t]];
    case 'right':
      return [[x + w - 1, y + h / 2 - t], [x + w + t * 0.9, y + h / 2], [x + w - 1, y + h / 2 + t]];
    default:
      return [[x + inset, y + h - 1], [x + inset * 0.4, y + h + t], [x + inset + t, y + h - 1]];
  }
}

function drawShape(ctx: Ctx, s: ShapeLayer) {
  ctx.save();
  if (s.kind === 'fade') {
    // A soft wash, clear at the top of its box and strongest at the bottom (`flip`: the other way up)
    const g = s.flip ? ctx.createLinearGradient(0, s.y + s.h, 0, s.y) : ctx.createLinearGradient(0, s.y, 0, s.y + s.h);
    const c = s.fill ?? '#000000';
    g.addColorStop(0, hexAlpha(c, 0));
    g.addColorStop(1, hexAlpha(c, s.opacity ?? 0.6));
    ctx.fillStyle = g;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.restore();
    return;
  }
  ctx.globalAlpha = s.opacity ?? 1;
  shapePath(ctx, s);
  if (s.kind === 'ribbon') {
    ctx.strokeStyle = s.stroke ?? s.fill ?? '#FFFFFF';
    ctx.lineWidth = s.strokeWidth ?? 24;
    ctx.lineCap = 'round';
    ctx.stroke();
  } else if (s.kind === 'frame') {
    ctx.strokeStyle = s.stroke ?? '#FFFFFF';
    ctx.lineWidth = s.strokeWidth ?? 3;
    ctx.stroke();
  } else {
    if (s.fill) {
      ctx.fillStyle = s.fill;
      ctx.fill();
    }
    if (s.stroke && s.strokeWidth) {
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = s.strokeWidth;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** A picture layer, keeping its shape inside its box (cut-outs sit at the bottom of the box) */
function drawImageLayer(ctx: Ctx, l: ImageLayer, photos: PhotoImages) {
  const img = photos[l.photoId];
  if (!img) return;
  if (l.radius || l.border) {
    // A photo set into the design: cropped to its box, with rounded corners and an edge
    ctx.save();
    if (l.border) {
      ctx.fillStyle = l.border;
      ctx.beginPath();
      roundRectPath(ctx, l.x - 10, l.y - 10, l.w + 20, l.h + 20, (l.radius ?? 0) + 6);
      ctx.fill();
    }
    ctx.beginPath();
    roundRectPath(ctx, l.x, l.y, l.w, l.h, l.radius ?? 0);
    ctx.clip();
    const r = photoRect(img.width, img.height, l.w, l.h, 'fill', 0.5, 0.5);
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, l.x + r.dx, l.y + r.dy, r.dw, r.dh);
    ctx.restore();
    return;
  }
  if (l.cover) {
    const r = photoRect(img.width, img.height, l.w, l.h, 'fill', 0.5, 0.5);
    ctx.drawImage(img, r.sx, r.sy, r.sw, r.sh, l.x + r.dx, l.y + r.dy, r.dw, r.dh);
    return;
  }
  const k = Math.min(l.w / img.width, l.h / img.height);
  const dw = img.width * k;
  const dh = img.height * k;
  ctx.drawImage(img, l.x + (l.w - dw) / 2, l.cutout ? l.y + l.h - dh : l.y + (l.h - dh) / 2, dw, dh);
}

/** Draws the design; the canvas is resized to the design's full size */
export function drawDesign(
  canvas: HTMLCanvasElement,
  doc: DesignDoc,
  families: FontFamilies,
  photos: PhotoImages = {},
  /** Draw smaller than full size (thumbnails); 1 = 1080 wide */
  resolution = 1,
  /** Leave out the background (to lay the words over a video) */
  overlayOnly = false
): LaidOutLayer[] {
  const { width, height } = FORMATS[doc.format];
  const w = Math.round(width * resolution);
  const h = Math.round(height * resolution);
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.setTransform(resolution, 0, 0, resolution, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, doc, width, height, photos, overlayOnly);
  // Order: background, shapes, text marked "behind", pictures, front shapes, then the rest of the text
  const laid = new Map(doc.layers.map((layer) => [layer.id, layoutLayer(ctx, layer, families)]));
  for (const shape of doc.shapes ?? []) if (!shape.front) drawShape(ctx, shape);
  for (const layer of doc.layers) if (layer.behind) drawLayer(ctx, layer, laid.get(layer.id)!, families);
  if (!overlayOnly) for (const img of doc.images ?? []) drawImageLayer(ctx, img, photos);
  for (const shape of doc.shapes ?? []) if (shape.front) drawShape(ctx, shape);
  for (const layer of doc.layers) if (!layer.behind) drawLayer(ctx, layer, laid.get(layer.id)!, families);
  return doc.layers.map((layer) => ({ id: layer.id, fitted: laid.get(layer.id)! }));
}

/** The design as a PNG file */
export function designToBlob(doc: DesignDoc, families: FontFamilies, photos: PhotoImages = {}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawDesign(canvas, doc, families, photos, (EXPORT_WIDTH[doc.format] ?? FORMATS[doc.format].width) / FORMATS[doc.format].width);
  // Photos are much smaller as JPEG; flat colours and text stay crisp as PNG
  const photo = doc.background.kind === 'photo' || (doc.images ?? []).length > 0;
  const [type, quality] = photo ? ['image/jpeg', 0.9] : ['image/png', undefined];
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Couldn’t make the image'))), type, quality)
  );
}

/** The words (and the dark wash) on a see-through PNG, at full size, to lay over a video */
export function overlayToBlob(doc: DesignDoc, families: FontFamilies): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawDesign(canvas, doc, families, {}, (EXPORT_WIDTH[doc.format] ?? FORMATS[doc.format].width) / FORMATS[doc.format].width, true);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Couldn’t make the overlay'))), 'image/png')
  );
}
