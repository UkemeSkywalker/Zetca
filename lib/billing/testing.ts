/**
 * In-memory credits and ledger for tests, so code that charges credits runs
 * without AWS. Every user starts on `plan` with `left` credits this month.
 */

import type { Credits, CreditBalance } from './credits';
import type { Ledger, LedgerEntry } from './ledger';
import { OutOfCreditsError, monthOf } from './credits';
import { planOf, type PlanId } from './plans';

export function memoryBilling(plan: PlanId = 'agency') {
  const used = new Map<string, number>();
  const bonus = new Map<string, number>();
  const entries: LedgerEntry[] = [];
  const balance = (userId: string): CreditBalance => {
    const p = planOf(plan);
    const u = used.get(userId) ?? 0;
    const b = bonus.get(userId) ?? 0;
    const left = Math.max(0, p.monthlyCredits - u);
    return { plan: p.id, monthly: { used: u, limit: p.monthlyCredits, left }, bonus: b, left: left + b, resetsAt: new Date().toISOString(), aiMedia: p.aiMedia };
  };
  const credits = {
    get: async (userId: string) => balance(userId),
    take: async (userId: string, cost: number) => {
      const b = balance(userId);
      if (b.monthly.left >= cost) {
        used.set(userId, b.monthly.used + cost);
        return { source: 'monthly' as const, month: monthOf(), balance: balance(userId) };
      }
      if (b.bonus >= cost) {
        bonus.set(userId, b.bonus - cost);
        return { source: 'bonus' as const, month: monthOf(), balance: balance(userId) };
      }
      throw new OutOfCreditsError(b, cost);
    },
    refund: async (userId: string, cost: number, source: 'monthly' | 'bonus') => {
      if (source === 'bonus') bonus.set(userId, (bonus.get(userId) ?? 0) + cost);
      else used.set(userId, Math.max(0, (used.get(userId) ?? 0) - cost));
    },
    grant: async (userId: string, n: number) => {
      bonus.set(userId, (bonus.get(userId) ?? 0) + n);
      return balance(userId);
    },
  } as unknown as Credits;
  const ledger = {
    add: async (e: Omit<LedgerEntry, 'entryId' | 'createdAt' | 'expiresAt'>) => {
      const full = { ...e, entryId: String(entries.length), createdAt: new Date().toISOString(), expiresAt: 0 } as LedgerEntry;
      entries.push(full);
      return full;
    },
    recent: async (userId: string) => entries.filter((x) => x.userId === userId).reverse(),
  } as unknown as Ledger;
  return { credits, ledger, entries, used };
}
