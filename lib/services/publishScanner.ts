/**
 * Publish Scanner - background task that periodically scans for and
 * publishes due posts.
 *
 * Runs as a setInterval loop started from instrumentation.ts at server
 * boot (Next.js runs as a persistent `next start` process in this
 * deployment, not serverless, so a long-lived interval is safe here).
 * Maintains a processing set to prevent overlapping scan cycles from
 * double-publishing the same post.
 */

import { PublisherService } from './publisherService';
import { getConfig } from '../config';

export class PublishScanner {
  private intervalMs: number;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private processingPostIds = new Set<string>();

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
      await this.publisherService.runScanCycle(this.processingPostIds);
    } catch (e: any) {
      console.error(`Scan cycle failed: ${e?.message ?? e}`);
    } finally {
      this.scheduleNext();
    }
  }
}
