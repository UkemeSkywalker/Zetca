/**
 * Pulls finished copies out of the copywriter's structured output while the
 * model is still writing it.
 *
 * The output arrives as JSON text in pieces, e.g. `{"copies":[{"text":"...`.
 * Each time an object directly inside the `copies` array closes, it's parsed
 * and returned, so the UI can show that copy before the rest are written.
 */

import { CopyItem, CopyItemSchema } from '../models/copy';

export function createCopyExtractor(): (chunk: string) => CopyItem[] {
  let depth = 0;
  let inString = false;
  let escaped = false;
  // Text of the copy object being read, or null between copies
  let current: string | null = null;

  return (chunk: string) => {
    const found: CopyItem[] = [];
    for (const ch of chunk) {
      if (current !== null) current += ch;

      if (inString) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{' || ch === '[') {
        depth++;
        // Depth 1 is the root object, 2 the copies array, 3 a copy
        if (ch === '{' && depth === 3) current = '{';
      } else if (ch === '}' || ch === ']') {
        if (ch === '}' && depth === 3 && current !== null) {
          const copy = parseCopy(current);
          if (copy) found.push(copy);
          current = null;
        }
        depth--;
      }
    }
    return found;
  };
}

function parseCopy(json: string): CopyItem | null {
  try {
    const parsed = CopyItemSchema.safeParse(JSON.parse(json));
    return parsed.success && parsed.data.text.trim() ? parsed.data : null;
  } catch {
    return null;
  }
}
