/**
 * Scheduled posts store their date and time in UTC ("YYYY-MM-DD", "HH:MM").
 * These helpers convert what a user picks in their own timezone to that form.
 */

export interface UtcSlot {
  date: string;
  time: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function toSlot(d: Date): UtcSlot {
  return {
    date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
  };
}

/** A date and time in the browser's own timezone, as a UTC slot */
export function localToUtcSlot(date: string, time: string): UtcSlot {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return toSlot(new Date(y, m - 1, d, hh, mm));
}

/** Milliseconds `timeZone` is ahead of UTC at the instant `at` */
function zoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Whether `timeZone` is an IANA zone this runtime knows, e.g. "Africa/Lagos" */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** A wall-clock date and time in `timeZone` (e.g. "Africa/Lagos"), as a UTC slot */
export function zonedToUtcSlot(date: string, time: string, timeZone: string): UtcSlot {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wallAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes settle the offset across a daylight-saving change
  let utc = wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone);
  utc = wallAsUtc - zoneOffsetMs(new Date(utc), timeZone);
  return toSlot(new Date(utc));
}
