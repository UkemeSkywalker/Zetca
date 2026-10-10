/**
 * Reads the copywriter's full-set output while the model is still writing it.
 *
 * Copies are written as plain labelled blocks rather than JSON, because plain
 * text streams word by word and has no quoting or escaping for a long caption
 * to break:
 *
 *   ### COPY
 *   ANGLE: Bold hook
 *   HASHTAGS: #OutfitIdeas #Lumier
 *   TEXT:
 *   The caption, over as many lines as it needs.
 *   ### END
 *
 * Each block is returned as soon as its END line arrives, and `partial()`
 * gives the copy being written in the meantime.
 */

import type { CopyItem } from '../models/copy';

export const COPY_FORMAT = `Write each copy in exactly this format, one after another, with nothing before, between or after the blocks:

### COPY
ANGLE: <the angle's short name, e.g. Bold hook>
HASHTAGS: <the hashtags, separated by spaces>
TEXT:
<the caption, which may span several lines; do not put the hashtags here>
### END`;

const START = '### COPY';
const END = '### END';

export interface CopyStreamParser {
  /** Feed the next piece of output; returns copies that finished in it */
  (chunk: string): CopyItem[];
  /** The copy being written right now, as far as it's got */
  partial(): { text: string; angle?: string } | null;
}

export function createCopyStreamParser(platform: string): CopyStreamParser {
  // Output not yet turned into finished copies
  let buffer = '';

  const parse = (chunk: string) => {
    buffer += chunk;
    const found: CopyItem[] = [];
    let end: number;
    while ((end = buffer.indexOf(END)) !== -1) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + END.length);
      const copy = parseBlock(block, platform);
      if (copy) found.push(copy);
    }
    return found;
  };

  parse.partial = () => {
    const start = buffer.indexOf(START);
    if (start === -1) return null;
    const fields = readFields(buffer.slice(start + START.length));
    if (fields.text === undefined) return fields.angle ? { text: '', angle: fields.angle } : null;
    return fields.angle ? { text: fields.text, angle: fields.angle } : { text: fields.text };
  };

  return parse;
}

function readFields(block: string): { angle?: string; hashtags?: string; text?: string } {
  const angle = /^ANGLE:[ \t]*(.+)$/m.exec(block)?.[1]?.trim();
  const hashtags = /^HASHTAGS:[ \t]*(.*)$/m.exec(block)?.[1];
  const textStart = /^TEXT:[ \t]*\n?/m.exec(block);
  const text = textStart ? block.slice(textStart.index + textStart[0].length).replace(/\s+$/, '') : undefined;
  return { angle: angle || undefined, hashtags, text };
}

function parseBlock(block: string, platform: string): CopyItem | null {
  const start = block.indexOf(START);
  if (start === -1) return null;
  const { angle, hashtags, text } = readFields(block.slice(start + START.length));
  if (!text?.trim()) return null;
  const tags = (hashtags ?? '')
    .split(/[\s,]+/)
    .map((t) => t.replace(/^#+/, '').trim())
    .filter(Boolean)
    .map((t) => `#${t}`);
  return { text: text.trim(), platform, hashtags: tags, ...(angle ? { angle } : {}) };
}
