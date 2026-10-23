/**
 * Charging for an action: take the credits, do the work, record what it
 * really cost, and give the credits back if it fails.
 *
 *   const result = await withCredits(userId, 'strategy', ACTIONS.strategy.credits, () => agent.generate(...));
 *
 * Work that finishes later (a Copywriter set running in the background) uses
 * `charge()` and settles the handle itself.
 */

import { Credits, PlanRequiredError, type CreditSource } from './credits';
import { Ledger } from './ledger';
import { ACTIONS, type ActionId } from './prices';
import { emptyUsage, withUsage, type Usage } from './usage';
import { planOf, PLANS } from './plans';

export interface Charge {
  credits: number;
  usage: Usage;
  /** Runs work whose AI use counts towards this charge */
  run<T>(fn: () => Promise<T>): Promise<T>;
  /** The work succeeded: records it (refunding `unused` credits, if some of it didn't happen) */
  done(unused?: number): Promise<void>;
  /** The work failed: gives every credit back */
  fail(): Promise<void>;
}

let credits = new Credits();
let ledger = new Ledger();

/** For tests */
export function setBillingBackends(c: Credits, l: Ledger) {
  credits = c;
  ledger = l;
}

const log = (what: string) => (error: unknown) => console.error(`Credit ledger: couldn't record ${what}:`, (error as Error).message);

export async function charge(userId: string, action: ActionId, cost: number, detail?: string): Promise<Charge> {
  const usage = emptyUsage();
  const taken = cost > 0 ? await credits.take(userId, cost) : null;
  let settled = false;
  const source: CreditSource | undefined = taken?.source;

  const record = (status: 'charged' | 'refunded', creditsCharged: number) =>
    ledger
      .add({
        userId,
        action,
        credits: creditsCharged,
        source,
        detail,
        status,
        inputTokens: usage.inputTokens || undefined,
        outputTokens: usage.outputTokens || undefined,
        costUsd: usage.costUsd ? Math.round(usage.costUsd * 100000) / 100000 : undefined,
      })
      .catch(log(`${action}`));

  return {
    credits: cost,
    usage,
    run: (fn) => withUsage(usage, fn),
    async done(unused = 0) {
      if (settled) return;
      settled = true;
      const refund = Math.min(Math.max(0, unused), cost);
      if (refund > 0 && taken) await credits.refund(userId, refund, taken.source, taken.month);
      await record('charged', cost - refund);
    },
    async fail() {
      if (settled) return;
      settled = true;
      if (taken) await credits.refund(userId, cost, taken.source, taken.month);
      await record('refunded', 0);
    },
  };
}

/** Takes the credits, runs `fn`, and refunds them if it throws */
export async function withCredits<T>(userId: string, action: ActionId, cost: number, fn: () => Promise<T>, detail?: string): Promise<T> {
  const c = await charge(userId, action, cost, detail);
  try {
    const result = await c.run(fn);
    await c.done();
    return result;
  } catch (error) {
    await c.fail();
    throw error;
  }
}

/** The price of a fixed-price action */
export const priceOf = (action: ActionId) => ACTIONS[action].credits;

/** Throws unless the user's plan includes AI images and videos (and the model's tier) */
export async function requireAiMedia(userId: string, what: string, tier = 1): Promise<void> {
  const balance = await credits.get(userId);
  const plan = planOf(balance.plan);
  if (!plan.aiMedia || plan.tier < tier) {
    const needed = Object.values(PLANS).find((p) => p.tier === Math.max(1, tier))!;
    throw new PlanRequiredError(what, needed.name);
  }
}

export const getCredits = () => credits;
export const getLedger = () => ledger;
