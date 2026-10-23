/**
 * Draws a design onto a 2D canvas at full size (1080 wide). The editor, the
 * thumbnails and the downloaded PNG all use this, so what you see is what you get.
 */

import { FORMATS, type DesignDoc, type FontId, type TextLayer } from './types';
import { fitText, type FittedText } from './textFit';
import { photoRect } from './photo';

/** Loaded photos by photoId, for photo backgrounds */
export type PhotoImages = Record<string, CanvasImageSource & { width: number; height: number }>;

/** CSS font-family for each font (from next/font, so the names are hashed) */
export type FontFamilies = Record<FontId, string>;

type Ctx = CanvasRenderingContext2D;

export function fontString(layer: Pick<TextLayer, 'font' | 'weight'>, size: number, families: FontFamilies): string {
  // Display fonts only come in one weight; asking for another would make the browser fake bold
  const weight = layer.font === 'jakarta' ? layer.weight : 400;
  return `${weight} ${size}px ${families[layer.font]}`;
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
    return ctx.measureText(t).width;
  };
  return fitText(
    text,
    { maxSize: layer.size, width: layer.width - pad * 2, height: layer.height - pad, lineHeight: layer.lineHeight },
    measure
  );
}

const padding = (size: number) => Math.round(size * 0.55);

function drawBackground(ctx: Ctx, doc: DesignDoc, w: number, h: number, photos: PhotoImages) {
  const bg = doc.background;
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
  lines.forEach((line, i) => ctx.fillText(line, anchorX, top + pad / 2 + i * lineH + baselineOffset));
}

/** Draws the design; the canvas is resized to the design's full size */
export function drawDesign(
  canvas: HTMLCanvasElement,
  doc: DesignDoc,
  families: FontFamilies,
  photos: PhotoImages = {},
  /** Draw smaller than full size (thumbnails); 1 = 1080 wide */
  resolution = 1
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
  drawBackground(ctx, doc, width, height, photos);
  return doc.layers.map((layer) => {
    const fitted = layoutLayer(ctx, layer, families);
    drawLayer(ctx, layer, fitted, families);
    return { id: layer.id, fitted };
  });
}

/** The design as a PNG file */
export function designToBlob(doc: DesignDoc, families: FontFamilies, photos: PhotoImages = {}): Promise<Blob> {
  const canvas = document.createElement('canvas');
  drawDesign(canvas, doc, families, photos);
  // Photos are much smaller as JPEG; flat colours and text stay crisp as PNG
  const [type, quality] = doc.background.kind === 'photo' ? ['image/jpeg', 0.9] : ['image/png', undefined];
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Couldn’t make the image'))), type, quality)
  );
}
