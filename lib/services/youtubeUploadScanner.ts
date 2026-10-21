/**
 * Background loop that runs the YouTube upload engine every 30 seconds.
 * The next cycle starts only after the current one ends, so a long upload
 * simply delays the next check. Started from instrumentation.ts.
 */

import { YouTubeUploadEngine } from './youtubeUploadEngine';

const INTERVAL_MS = 30_000;

export class YouTubeUploadScanner {
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private engine = new YouTubeUploadEngine()) {}

  start(): void {
    this.running = true;
    console.info(`YouTube upload scanner started (interval: ${INTERVAL_MS / 1000}s)`);
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => this.runCycle(), INTERVAL_MS);
  }

  private async runCycle(): Promise<void> {
    try {
      const handled = await this.engine.runCycle();
      if (handled) console.info(`YouTube upload scanner: handled ${handled} video(s)`);
    } catch (e) {
      console.error(`YouTube upload cycle failed: ${(e as Error)?.message ?? e}`);
    } finally {
      this.scheduleNext();
    }
  }
}
