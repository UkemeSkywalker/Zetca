/**
 * The real cost behind a charged action: every AI call made while it runs
 * adds its tokens (and any other provider cost) here, so the credit ledger
 * records what the action actually cost Zetca.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { BEDROCK_USD } from './prices';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  /** Bedrock tokens plus anything else (Higgsfield, Transcribe), in dollars */
  costUsd: number;
  calls: number;
}

const store = new AsyncLocalStorage<Usage>();

export const emptyUsage = (): Usage => ({ inputTokens: 0, outputTokens: 0, costUsd: 0, calls: 0 });

/** Runs `fn`, collecting the usage of everything it calls */
export function withUsage<T>(usage: Usage, fn: () => Promise<T>): Promise<T> {
  return store.run(usage, fn);
}

/** An AI call finished (called by runAgent) */
export function recordTokens(inputTokens: number, outputTokens: number): void {
  const u = store.getStore();
  if (!u) return;
  u.inputTokens += inputTokens;
  u.outputTokens += outputTokens;
  u.costUsd += inputTokens * BEDROCK_USD.input + outputTokens * BEDROCK_USD.output;
  u.calls += 1;
}

/** A cost that isn't tokens, such as a Higgsfield image or a Transcribe job */
export function recordCost(usd: number): void {
  const u = store.getStore();
  if (u) u.costUsd += usd;
}
