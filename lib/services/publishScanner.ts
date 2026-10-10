/**
 * Publish Scanner - background task that periodically scans for and
 * publishes due posts.
 *
 * Runs as a timer loop started from instrumentation.ts at server boot
 * (Next.js runs as a persistent `next start` process in this deployment,
 * not serverless). The next scan starts only after the current one ends.
 * Several servers can run scanners safely: each post is claimed with a
 * conditional write before it's published.
 */

import { PublisherService } from './publisherService';
import { getConfig } from '../config';

/** Scans between dueAt backfills (about an hour at the default 60s interval) */
const BACKFILL_EVERY_CYCLES = 60;

export class PublishScanner {
  private intervalMs: number;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private cycles = 0;

  constructor(private publisherService: PublisherService) {
    this.intervalMs = getConfig().publisherScanIntervalSeconds * 1000;
  }

  start(): void {
    this.running = true;
    console.info(`Publish Scanner started (interval: ${this.intervalMs / 1000}s)`);
    this.scheduleNext();
  }

  stop(): void {
    this.running = false;
    if (this.timer) clearTimeout(this.timer);
    console.info('Publish Scanner stopped');
  }

  private scheduleNext(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => this.runCycle(), this.intervalMs);
  }

  private async runCycle(): Promise<void> {
    try {
      // About hourly, give older scheduled posts the dueAt the due-posts index needs
      if (this.cycles++ % BACKFILL_EVERY_CYCLES === 0) await this.publisherService.backfillDueAt();
      await this.publisherService.runScanCycle();
    } catch (e) {
      console.error(`Scan cycle failed: ${(e as Error)?.message ?? e}`);
    } finally {
      this.scheduleNext();
    }
  }
}
