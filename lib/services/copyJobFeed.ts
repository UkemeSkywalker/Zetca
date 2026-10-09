/**
 * Live view of a running copy job: the text each platform is writing right
 * now, so the page can show it as it's typed.
 *
 * It lives in this server's memory only (writing every few tokens to the
 * database would be far too many writes). Finished copies are saved as usual;
 * this is just the in-between text. A job running on another server, or one
 * that has finished, has no feed, and the page falls back to the saved copies.
 */

export interface LaneState {
  /** Angle of the copy being written, once the model has written it */
  angle?: string;
  /** The copy text so far (the tail, if it's long) */
  text: string;
  /** Copies this platform has finished */
  written: number;
  /** All of this platform's copies are done (or it failed) */
  done: boolean;
}

export type FeedSnapshot = Record<string, LaneState>;

export type FeedEvent =
  | { type: 'update'; lanes: FeedSnapshot }
  | { type: 'copy'; platform: string }
  | { type: 'done' };

interface Feed {
  lanes: FeedSnapshot;
  listeners: Set<(event: FeedEvent) => void>;
  finished: boolean;
  /** Pending lane changes, sent together so a fast model doesn't flood the page */
  dirty: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

/** How often lane text is pushed to listeners */
const FLUSH_MS = 120;
/** Characters of the in-progress copy sent to the page */
const MAX_LANE_TEXT = 320;
/** A finished feed is kept briefly so a page that reconnects sees "done" */
const KEEP_FINISHED_MS = 60_000;

// Kept on globalThis so every route bundle (and dev hot reloads) shares one registry
const registry: Map<string, Feed> = ((globalThis as { __copyJobFeeds?: Map<string, Feed> }).__copyJobFeeds ??= new Map());

function emit(feed: Feed, event: FeedEvent) {
  for (const listener of feed.listeners) {
    try {
      listener(event);
    } catch {
      feed.listeners.delete(listener);
    }
  }
}

function flush(feed: Feed) {
  feed.timer = undefined;
  if (!feed.dirty) return;
  feed.dirty = false;
  emit(feed, { type: 'update', lanes: snapshot(feed) });
}

function snapshot(feed: Feed): FeedSnapshot {
  return Object.fromEntries(Object.entries(feed.lanes).map(([k, v]) => [k, { ...v }]));
}

function schedule(feed: Feed) {
  feed.dirty = true;
  feed.timer ??= setTimeout(() => flush(feed), FLUSH_MS);
}

export function openFeed(jobId: string, platforms: string[]): void {
  registry.set(jobId, {
    lanes: Object.fromEntries(platforms.map((p) => [p, { text: '', written: 0, done: false }])),
    listeners: new Set(),
    finished: false,
    dirty: false,
  });
}

/** The copy a platform is writing has grown */
export function laneWriting(jobId: string, platform: string, partial: { text: string; angle?: string }): void {
  const feed = registry.get(jobId);
  const lane = feed?.lanes[platform];
  if (!feed || !lane || lane.done) return;
  lane.text = partial.text.length > MAX_LANE_TEXT ? `…${partial.text.slice(-MAX_LANE_TEXT)}` : partial.text;
  if (partial.angle) lane.angle = partial.angle;
  schedule(feed);
}

/** A platform finished (and saved) one copy */
export function laneCopySaved(jobId: string, platform: string): void {
  const feed = registry.get(jobId);
  const lane = feed?.lanes[platform];
  if (!feed || !lane) return;
  lane.written++;
  lane.text = '';
  lane.angle = undefined;
  emit(feed, { type: 'copy', platform });
  schedule(feed);
}

/** A platform has finished all its copies, or failed */
export function laneDone(jobId: string, platform: string): void {
  const feed = registry.get(jobId);
  const lane = feed?.lanes[platform];
  if (!feed || !lane) return;
  lane.done = true;
  lane.text = '';
  schedule(feed);
}

export function closeFeed(jobId: string): void {
  const feed = registry.get(jobId);
  if (!feed) return;
  if (feed.timer) clearTimeout(feed.timer);
  feed.dirty = true;
  flush(feed);
  feed.finished = true;
  emit(feed, { type: 'done' });
  feed.listeners.clear();
  setTimeout(() => registry.delete(jobId), KEEP_FINISHED_MS).unref?.();
}

/**
 * Listen to a job's feed. The listener gets the current state straight away.
 * Returns an unsubscribe function, or null if this server has no live feed
 * for the job (it finished, or runs elsewhere).
 */
export function subscribeFeed(jobId: string, listener: (event: FeedEvent) => void): (() => void) | null {
  const feed = registry.get(jobId);
  if (!feed) return null;
  listener({ type: 'update', lanes: snapshot(feed) });
  if (feed.finished) {
    listener({ type: 'done' });
    return () => {};
  }
  feed.listeners.add(listener);
  return () => feed.listeners.delete(listener);
}
