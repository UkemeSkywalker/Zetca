/**
 * Browser client for Talk to Zetca's brand research
 */

import type { BrandEdit, PublicBrandResearch } from '@/lib/models/brandResearch';

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

/** Saves the campaign look picked from the suggested styles (null clears it) */
export async function chooseResearchStyle(researchId: string, style: string | null): Promise<PublicBrandResearch> {
  return (await call<{ research: PublicBrandResearch }>(`/api/strategist/research/${encodeURIComponent(researchId)}/style`, { method: 'PUT', body: JSON.stringify({ style }) })).research;
}

/** Saves a change made by hand to the brand result */
export async function editResearch(researchId: string, edit: BrandEdit): Promise<PublicBrandResearch> {
  return (await call<{ research: PublicBrandResearch }>(`/api/strategist/research/${encodeURIComponent(researchId)}`, { method: 'PATCH', body: JSON.stringify(edit) })).research;
}

/** Asks Zetca to change part of the brand result ("make the colours warmer") */
export async function chatAboutResearch(researchId: string, message: string): Promise<PublicBrandResearch> {
  return (await call<{ research: PublicBrandResearch }>(`/api/strategist/research/${encodeURIComponent(researchId)}/chat`, { method: 'POST', body: JSON.stringify({ message }) })).research;
}
