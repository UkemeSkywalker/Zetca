/**
 * YouTube makes chapters from timestamps in the description. It needs at
 * least three, the first at 0:00, each at least 10 seconds long.
 */

export interface Chapter {
  seconds: number;
  label: string;
  title: string;
}

const LINE = /^\s*(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s+[-–—:]?\s*(.+?)\s*$/;

export function parseChapters(description: string): Chapter[] {
  const chapters: Chapter[] = [];
  for (const line of description.split('\n')) {
    const m = LINE.exec(line);
    if (!m) continue;
    const [, h, mm, ss, title] = m;
    if (Number(ss) > 59) continue;
    const seconds = Number(h ?? 0) * 3600 + Number(mm) * 60 + Number(ss);
    chapters.push({ seconds, label: formatTimestamp(seconds), title });
  }
  return chapters;
}

export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${String(m).padStart(2, '0')}:${sec}`;
}

/** Why YouTube won't show these chapters, or null when it will (or there are none) */
export function chapterProblem(chapters: Chapter[], durationSeconds?: number): string | null {
  if (chapters.length === 0) return null;
  if (chapters[0].seconds !== 0) return 'The first chapter must start at 00:00.';
  if (chapters.length < 3) return 'YouTube needs at least 3 chapters.';
  for (let i = 1; i < chapters.length; i++) {
    if (chapters[i].seconds <= chapters[i - 1].seconds) return 'Chapters must be in time order.';
    if (chapters[i].seconds - chapters[i - 1].seconds < 10) return 'Each chapter must be at least 10 seconds long.';
  }
  if (durationSeconds && chapters[chapters.length - 1].seconds > durationSeconds - 10) {
    return 'The last chapter starts too close to the end of the video.';
  }
  return null;
}

/** The description with one more chapter line, a sensible time after the last one */
export function addChapterLine(description: string, durationSeconds?: number): string {
  const chapters = parseChapters(description);
  let line: string;
  if (chapters.length === 0) {
    line = '00:00 Intro';
  } else {
    const last = chapters[chapters.length - 1].seconds;
    const step = durationSeconds ? Math.max(10, Math.round(durationSeconds / 6)) : 60;
    line = `${formatTimestamp(last + step)} `;
  }
  const trimmed = description.replace(/\s+$/, '');
  if (!trimmed) return line;
  // Keep the chapter lines together: a blank line before the first one only
  return chapters.length === 0 ? `${trimmed}\n\n${line}` : `${trimmed}\n${line}`;
}

/** The description with its chapter lines replaced by `chapters` (added at the end) */
export function withChapters(description: string, chapters: { seconds: number; title: string }[]): string {
  const kept = description
    .split('\n')
    .filter((line) => !/^\s*(?:\d{1,2}:)?\d{1,2}:\d{2}\s/.test(line))
    .join('\n')
    .replace(/\s+$/, '');
  const block = chapters.map((c) => `${formatTimestamp(c.seconds)} ${c.title}`).join('\n');
  return kept ? `${kept}\n\n${block}` : block;
}
