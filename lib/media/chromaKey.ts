/**
 * Cut-outs without a background-removal service: the AI repaints everything
 * but the subject in one flat colour (green, magenta or blue), and this turns
 * that colour see-through. The result is a PNG the same size as the photo, so
 * it lines up exactly when laid over it.
 */

import sharp from 'sharp';

export type KeyColor = 'green' | 'magenta' | 'blue';

/** The flat colour the AI is asked to paint, by name and hex */
export const KEY_HEX: Record<KeyColor, string> = { green: '#00FF00', magenta: '#FF00FF', blue: '#0000FF' };

/** How strongly a pixel is the key colour (0 = not at all, 255 = pure key) */
function keyness(r: number, g: number, b: number, key: KeyColor): number {
  if (key === 'green') return g - Math.max(r, b);
  if (key === 'blue') return b - Math.max(r, g);
  return Math.min(r, b) - g;
}

/** Below `solid` it's the subject; above `clear` it's background; in between, a soft edge */
const SOLID = 30;
const CLEAR = 90;

/**
 * Makes the key colour see-through. `photo` is the original (same framing);
 * the cut-out is sized to it so the two line up.
 */
export async function keyOut(keyed: Buffer, key: KeyColor, size?: { width: number; height: number }): Promise<{ png: Buffer; width: number; height: number; kept: number }> {
  let img = sharp(keyed).removeAlpha();
  if (size) img = img.resize(size.width, size.height, { fit: 'fill' });
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  let kept = 0;
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const k = keyness(r, g, b, key);
    const a = k >= CLEAR ? 0 : k <= SOLID ? 255 : Math.round((255 * (CLEAR - k)) / (CLEAR - SOLID));
    // Edges pick up the key colour; pull that channel back down to the others
    let [r2, g2, b2] = [r, g, b];
    if (a < 255) {
      if (key === 'green') g2 = Math.min(g, Math.max(r, b) + 10);
      else if (key === 'blue') b2 = Math.min(b, Math.max(r, g) + 10);
      else {
        const lid = g + 10;
        r2 = Math.min(r, lid);
        b2 = Math.min(b, lid);
      }
    }
    out[j] = r2;
    out[j + 1] = g2;
    out[j + 2] = b2;
    out[j + 3] = a;
    if (a > 128) kept++;
  }
  const png = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer();
  return { png, width: info.width, height: info.height, kept: kept / (info.width * info.height) };
}

/** What the AI is asked when making the flat-colour version for a cut-out */
export function cutoutPrompt(key: KeyColor): string {
  return (
    'Keep the main subject exactly as it is: same pose, same position, same size, same lighting and colours on it. ' +
    `Replace everything else (walls, room, floor, sky, background objects) with a perfectly flat, uniform pure ${key} background, hex ${KEY_HEX[key]}, with no shadows, no gradient and no texture.`
  );
}
