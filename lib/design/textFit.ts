/**
 * Fits a text layer into its box: wraps words onto lines and shrinks the font
 * until every line fits the width and all lines fit the height. Big words are
 * never cut off ("ANYWA…"): the text gets smaller instead.
 */

/** Width of `text` in px at font size `size` */
export type Measure = (text: string, size: number) => number;

export interface FittedText {
  size: number;
  lines: string[];
  /** Height of the block of lines in px */
  height: number;
}

/** Breaks text onto lines no wider than `maxWidth`, keeping line breaks the user typed */
export function wrapLines(text: string, size: number, maxWidth: number, measure: Measure): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const next = `${line} ${word}`;
      if (measure(next, size) <= maxWidth) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

const MIN_SIZE = 12;

export function fitText(
  text: string,
  { maxSize, width, height, lineHeight }: { maxSize: number; width: number; height: number; lineHeight: number },
  measure: Measure
): FittedText {
  let size = maxSize;
  for (;;) {
    const lines = wrapLines(text, size, width, measure);
    const blockHeight = lines.length * size * lineHeight;
    const fits = lines.every((l) => measure(l, size) <= width) && blockHeight <= height;
    if (fits || size <= MIN_SIZE) return { size, lines, height: blockHeight };
    size = Math.max(MIN_SIZE, Math.floor(size * 0.94));
  }
}
