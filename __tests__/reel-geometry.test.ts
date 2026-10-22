/**
 * @jest-environment node
 */

import { cardOffsets, cardShape, roundedQuadPath, PITCH } from '@/lib/home/reelGeometry';

describe('reel geometry', () => {
  it('draws the centre card as an upright 170×280 rectangle', () => {
    const c = cardShape(0, 1440, 607);
    expect(c.width).toBeCloseTo(170);
    expect(c.height).toBeCloseTo(280, 0); // each edge grows with its own distance, so +0.4 here
    expect(c.left).toBeCloseTo(720 - 85);
    expect(c.points[0][1]).toBeCloseTo(c.points[1][1]); // level top edge
  });

  it('makes edge cards wider and taller, outer edge taller than inner', () => {
    const right = cardShape(4 * PITCH, 1440, 607);
    expect(right.width).toBeGreaterThan(190);
    const innerH = right.points[3][1] - right.points[0][1];
    const outerH = right.points[2][1] - right.points[1][1];
    expect(outerH).toBeGreaterThan(innerH);
    expect(outerH).toBeGreaterThan(330);
  });

  it('is symmetric left and right', () => {
    const l = cardShape(-3 * PITCH, 1440, 607);
    const r = cardShape(3 * PITCH, 1440, 607);
    expect(l.width).toBeCloseTo(r.width);
    expect(720 - (l.left + l.width)).toBeCloseTo(r.left - 720);
  });

  it('loops the row seamlessly as it scrolls', () => {
    const a = cardOffsets(10, 0);
    const b = cardOffsets(10, 10 * PITCH);
    expect(a).toEqual(b);
    expect(new Set(cardOffsets(10, 123).map((t) => Math.round(t))).size).toBe(10);
  });

  it('builds a closed rounded path for clip-path', () => {
    const path = roundedQuadPath(cardShape(0, 1440, 607).points, 15, 1);
    expect(path.startsWith("path('M")).toBe(true);
    expect(path.endsWith(" Z')")).toBe(true);
    expect((path.match(/Q/g) ?? []).length).toBe(4);
  });
});
