/**
 * Browser client for the /api/designs routes
 */

import type { DesignInput, DesignRecord } from '@/lib/design/types';
import type { DesignWriterRequest, DesignWriterResponse } from '@/lib/models/designWriter';

export class DesignRequestError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DesignRequestError';
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: 'include' });
  } catch {
    throw new DesignRequestError('Couldn’t reach Zetca. Check your connection and try again.', 'NETWORK');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new DesignRequestError(body.error || `Request failed (${res.status})`, body.code);
  return body as T;
}

export async function listDesigns(): Promise<DesignRecord[]> {
  return (await call<{ designs: DesignRecord[] }>('/api/designs')).designs;
}

export async function getDesign(designId: string): Promise<DesignRecord> {
  return (await call<{ design: DesignRecord }>(`/api/designs/${encodeURIComponent(designId)}`)).design;
}

export async function createDesign(input: DesignInput): Promise<DesignRecord> {
  return (await call<{ design: DesignRecord }>('/api/designs', { method: 'POST', body: JSON.stringify(input) })).design;
}

export async function saveDesign(designId: string, input: DesignInput): Promise<DesignRecord> {
  return (await call<{ design: DesignRecord }>(`/api/designs/${encodeURIComponent(designId)}`, { method: 'PUT', body: JSON.stringify(input) })).design;
}

export async function deleteDesign(designId: string): Promise<void> {
  await call(`/api/designs/${encodeURIComponent(designId)}`, { method: 'DELETE' });
}

export function writeDesignText(input: DesignWriterRequest) {
  return call<DesignWriterResponse>('/api/designs/write', { method: 'POST', body: JSON.stringify(input) });
}

export const designerPath = (designId?: string) => (designId ? `/dashboard/designer/${encodeURIComponent(designId)}` : '/dashboard/designer');

/** The brand handle shown at the bottom of designs, remembered on this device */
const BRAND_KEY = 'zetca.designer.handle';
export function rememberedHandle(): string {
  try {
    return localStorage.getItem(BRAND_KEY) ?? '';
  } catch {
    return '';
  }
}
export function rememberHandle(handle: string) {
  try {
    localStorage.setItem(BRAND_KEY, handle);
  } catch {
    // Private windows can block storage; the handle just isn't remembered
  }
}

export type { StockPhoto, SavedPhoto, Orientation } from '@/lib/services/stockPhotoService';
import type { StockPhoto, SavedPhoto, Orientation } from '@/lib/services/stockPhotoService';

export async function searchPhotos(q: string, orientation: Orientation = 'all', page = 1): Promise<StockPhoto[]> {
  const params = new URLSearchParams({ q, orientation, page: String(page) });
  return (await call<{ photos: StockPhoto[] }>(`/api/designs/photos/search?${params}`)).photos;
}

export async function savePhoto(pixabayId: number): Promise<SavedPhoto> {
  return (await call<{ photo: SavedPhoto }>('/api/designs/photos', { method: 'POST', body: JSON.stringify({ pixabayId }) })).photo;
}
