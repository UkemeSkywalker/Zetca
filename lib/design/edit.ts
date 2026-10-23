/**
 * Small, pure edits to a design, used by the editor (and easy to test)
 */

import { bestTextColor, passes } from './contrast';
import { FORMATS, backgroundColors, type Background, type DesignDoc, type FormatId, type TextLayer } from './types';

export function updateLayer(doc: DesignDoc, id: string, patch: Partial<TextLayer>): DesignDoc {
  return { ...doc, layers: doc.layers.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
}

export function removeLayer(doc: DesignDoc, id: string): DesignDoc {
  return { ...doc, layers: doc.layers.filter((l) => l.id !== id) };
}

export const newLayerId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export function duplicateLayer(doc: DesignDoc, id: string): { doc: DesignDoc; id: string } {
  const source = doc.layers.find((l) => l.id === id);
  if (!source) return { doc, id };
  const copy = { ...source, id: newLayerId(), y: Math.min(source.y + 60, FORMATS[doc.format].height - source.height) };
  return { doc: { ...doc, layers: [...doc.layers, copy] }, id: copy.id };
}

export type NewTextKind = 'heading' | 'subheading' | 'small';

/** Adds a text box in the middle of the design, in a colour that reads on the background */
export function addText(doc: DesignDoc, kind: NewTextKind): { doc: DesignDoc; id: string } {
  const { width, height } = FORMATS[doc.format];
  const color = bestTextColor(backgroundColors(doc));
  const presets: Record<NewTextKind, { text: string; size: number; font: TextLayer['font']; weight: TextLayer['weight']; h: number; uppercase: boolean; role: TextLayer['role'] }> = {
    heading: { text: 'Add a heading', size: 120, font: 'anton', weight: 400, h: 260, uppercase: true, role: 'headline' },
    subheading: { text: 'Add a subheading', size: 60, font: 'jakarta', weight: 800, h: 150, uppercase: false, role: 'body' },
    small: { text: 'Add a little text', size: 34, font: 'jakarta', weight: 600, h: 90, uppercase: false, role: 'body' },
  };
  const preset = presets[kind];
  const layer: TextLayer = {
    id: newLayerId(),
    role: preset.role,
    text: preset.text,
    font: preset.font,
    weight: preset.weight,
    size: preset.size,
    color,
    align: 'center',
    valign: 'middle',
    x: 84,
    y: Math.round((height - preset.h) / 2),
    width: width - 168,
    height: preset.h,
    lineHeight: 1.1,
    uppercase: preset.uppercase,
    letterSpacing: 0,
  };
  return { doc: { ...doc, layers: [...doc.layers, layer] }, id: layer.id };
}

/**
 * Sets the background and recolours any text that would become hard to read
 * (pills keep their own fill, so they're left alone).
 */
export function setBackground(doc: DesignDoc, background: Background): DesignDoc {
  const next = { ...doc, background };
  const behind = backgroundColors(next);
  return {
    ...next,
    layers: next.layers.map((l) => (l.fill || passes(l.color, behind) ? l : { ...l, color: bestTextColor(behind) })),
  };
}

/** Text layers that are hard to read against what's behind them */
export function lowContrastLayers(doc: DesignDoc): TextLayer[] {
  const behind = backgroundColors(doc);
  return doc.layers.filter((l) => l.text.trim() && !passes(l.color, l.fill ? [l.fill] : behind));
}

/** Gives every hard-to-read layer the colour that reads best */
export function fixContrast(doc: DesignDoc): DesignDoc {
  const behind = backgroundColors(doc);
  return {
    ...doc,
    layers: doc.layers.map((l) => {
      const bg = l.fill ? [l.fill] : behind;
      return passes(l.color, bg) ? l : { ...l, color: bestTextColor(bg) };
    }),
  };
}

/** Changes the size, moving and stretching text boxes so they keep their place */
export function changeFormat(doc: DesignDoc, format: FormatId): DesignDoc {
  if (format === doc.format) return doc;
  const k = FORMATS[format].height / FORMATS[doc.format].height;
  return {
    ...doc,
    format,
    layers: doc.layers.map((l) => ({ ...l, y: Math.round(l.y * k), height: Math.max(20, Math.round(l.height * k)) })),
  };
}

/** Sets the handle at the bottom of the design, adding a footer if there isn't one */
export function setHandle(doc: DesignDoc, handle: string): DesignDoc {
  const footer = doc.layers.find((l) => l.role === 'footer');
  if (footer) return updateLayer(doc, footer.id, { text: handle });
  if (!handle.trim()) return doc;
  const { height } = FORMATS[doc.format];
  const layer: TextLayer = {
    id: 'footer',
    role: 'footer',
    text: handle,
    font: 'jakarta',
    weight: 800,
    size: 30,
    color: bestTextColor(backgroundColors(doc)),
    align: 'left',
    valign: 'top',
    x: 84,
    y: height - 134,
    width: 912,
    height: 50,
    lineHeight: 1.1,
    uppercase: true,
    letterSpacing: 0.08,
  };
  return { ...doc, layers: [...doc.layers, layer] };
}

/** Keeps a box on the canvas */
export function clampBox(doc: DesignDoc, box: { x: number; y: number; width: number; height: number }) {
  const { width: W, height: H } = FORMATS[doc.format];
  const width = Math.min(Math.max(80, box.width), W);
  const height = Math.min(Math.max(30, box.height), H);
  return {
    width: Math.round(width),
    height: Math.round(height),
    x: Math.round(Math.min(Math.max(box.x, -width / 2), W - width / 2)),
    y: Math.round(Math.min(Math.max(box.y, -height / 2), H - height / 2)),
  };
}
