/**
 * Browser client for Talk to Zetca's brand research
 */

import type { PublicBrandResearch } from '@/lib/models/brandResearch';

export type { PublicBrandResearch };

export class ResearchRequestError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
    });
  } catch {
    throw new ResearchRequestError('Couldn’t reach Zetca. Check your connection and try again.', 'NETWORK');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ResearchRequestError(body.error || `Request failed (${res.status})`, body.code);
  return body as T;
}

export async function startResearch(message: string): Promise<PublicBrandResearch> {
  return (await call<{ research: PublicBrandResearch }>('/api/strategist/research', { method: 'POST', body: JSON.stringify({ message }) })).research;
}

export async function getResearch(researchId: string): Promise<PublicBrandResearch> {
  return (await call<{ research: PublicBrandResearch }>(`/api/strategist/research/${encodeURIComponent(researchId)}`)).research;
}
