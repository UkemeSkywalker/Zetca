/**
 * Geometry for the home hero's curved reel row: cards on the inside of a
 * cylinder. Centre cards are upright rectangles; cards towards the edges
 * get wider and taller, with their outer edge taller than the inner edge.
 * All values are in frame units (1u = 1/1440 of the frame on desktop).
 */

export const PITCH = 196;
const BASE_WIDTH = 170;
const BASE_HEIGHT = 280;
const MAX_D = 1.2;

export interface CardShape {
  /** Left edge, in frame units from the frame's left */
  left: number;
  width: number;
  /** Top of the bounding box */
  top: number;
  height: number;
  /** clip-path for the rounded quad, relative to the bounding box, in units */
  points: [number, number][];
}

/**
 * @param t       the card's unpushed offset from the centre, in units
 * @param frameW  frame width in units (1440 desktop, 640 phones)
 * @param centreY vertical centre of the row at the middle, in units
 */
export function cardShape(t: number, frameW: number, centreY: number): CardShape {
  const centre = frameW / 2;
  const reach = centre - 14; // 706 on desktop
  const pushed = t * (1 + 0.083 * (t / reach) ** 2);
  const d = Math.min(Math.abs(pushed) / reach, MAX_D);
  const width = BASE_WIDTH + 48 * d * d;
  const xL = centre + pushed - width / 2;
  const xR = xL + width;
  const edge = (x: number) => BASE_HEIGHT + 92 * Math.min(Math.abs(x - centre) / reach, MAX_D) ** 2.6;
  const hL = edge(xL);
  const hR = edge(xR);
  const cy = centreY - 12 * d * d;
  const top = cy - Math.max(hL, hR) / 2;
  const height = Math.max(hL, hR);
  const y = (v: number) => v - top;
  return {
    left: xL,
    width,
    top,
    height,
    points: [
      [0, y(cy - hL / 2)],
      [width, y(cy - hR / 2)],
      [width, y(cy + hR / 2)],
      [0, y(cy + hL / 2)],
    ],
  };
}

/** A rounded quad as an SVG path (scaled to pixels), for clip-path: path() */
export function roundedQuadPath(points: [number, number][], radius: number, scale: number): string {
  const p = points.map(([x, y]) => [x * scale, y * scale] as [number, number]);
  const r = radius * scale;
  const toward = (a: [number, number], b: [number, number]) => {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const k = Math.min(r, len / 2) / len;
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  };
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    const prev = p[(i + 3) % 4];
    const cur = p[i];
    const next = p[(i + 1) % 4];
    const a = toward(cur, prev);
    const b = toward(cur, next);
    parts.push(`${i === 0 ? 'M' : 'L'}${a[0].toFixed(1)} ${a[1].toFixed(1)}`);
    parts.push(`Q${cur[0].toFixed(1)} ${cur[1].toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  }
  return `path('${parts.join(' ')} Z')`;
}

/** Each card's offset from the centre for a scroll position; the row loops every count × pitch */
export function cardOffsets(count: number, scroll: number): number[] {
  const total = count * PITCH;
  return Array.from({ length: count }, (_, i) => {
    const raw = (((i * PITCH - scroll) % total) + total) % total;
    return raw - total / 2;
  });
}
