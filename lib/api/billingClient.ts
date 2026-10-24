/**
 * Browser client for credits: the balance (shared by every component that
 * shows it) and the Billing page's data.
 */

import type { CreditBalance } from '@/lib/billing/credits';
import type { Plan } from '@/lib/billing/plans';

export type { CreditBalance };

export interface UsageItem {
  id: string;
  action: string;
  label: string;
  credits: number;
  detail?: string;
  status: 'charged' | 'refunded' | 'granted';
  createdAt: string;
}

export interface Billing {
  credits: CreditBalance;
  plans: Plan[];
  topUps: readonly { id: string; credits: number; priceUsd: number }[];
  prices: Record<string, number>;
  usage: UsageItem[];
}

export async function getBilling(): Promise<Billing> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch('/api/billing', { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.detail || body.error || 'Couldn’t load your credits');
  return body as Billing;
}

// ---------------------------------------------------------------------------
// The balance, shared: anything that spends credits calls refreshCredits()
// ---------------------------------------------------------------------------

let current: CreditBalance | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<(b: CreditBalance | null) => void>();

/** Shows a balance everywhere (e.g. one the Billing page just loaded) */
export function publishCredits(balance: CreditBalance): void {
  current = balance;
  listeners.forEach((l) => l(current));
}

/** Loads the balance; calls while one is loading share it */
export function refreshCredits(): Promise<void> {
  if (loading) return loading;
  loading = getBilling()
    .then((b) => publishCredits(b.credits))
    .catch(() => undefined)
    .finally(() => {
      loading = null;
    });
  return loading;
}

export function subscribeCredits(listener: (b: CreditBalance | null) => void): () => void {
  listeners.add(listener);
  if (current) listener(current);
  else if (!loading) void refreshCredits();
  return () => listeners.delete(listener);
}

export const formatCredits = (n: number) => `${n.toLocaleString('en-US')} ${n === 1 ? 'credit' : 'credits'}`;

/**
 * Refreshes the balance a moment after any call that might have spent
 * credits (every non-GET call to Zetca's API), and when the tab comes back.
 */
let watching = false;
export function watchSpending(): void {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const soon = (ms = 1200) => {
    clearTimeout(timer);
    timer = setTimeout(() => void refreshCredits(), ms);
  };
  const original = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const res = await original(input, init);
    const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET' && url.startsWith('/api/') && !url.startsWith('/api/billing')) soon();
    // AI images and videos finish while the page checks on them
    if (method === 'GET' && url.startsWith('/api/designs/ai/')) soon(2000);
    return res;
  };
  window.addEventListener('focus', () => soon(200));
}
