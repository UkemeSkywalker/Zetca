/**
 * Free stock photos from Pixabay for designs.
 *
 * Pixabay's rules: cache searches for 24 hours, and don't hotlink images
 * permanently. Search results are shown from Pixabay's links for now; a photo
 * someone picks is copied into Zetca's storage, and the design uses that copy.
 */

import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { request } from 'https';
import { getConfig } from '../config';

export interface HttpResponse {
  status: number;
  body: Buffer;
}

/**
 * A GET over HTTP/1.1. Node's built-in fetch uses HTTP/2 with some servers,
 * and its HTTP/2 sessions to Pixabay's CDN can break ("session has been destroyed").
 */
export function httpGet(url: string, timeoutMs: number): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'GET', headers: { 'User-Agent': 'Zetca' } }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Timed out')));
    req.on('error', reject);
    req.end();
  });
}

export interface StockPhoto {
  /** Pixabay's id for the photo */
  id: number;
  /** A ~640px copy for search results and previews (valid for 24 hours) */
  previewUrl: string;
  width: number;
  height: number;
  /** The photographer's name and the photo's page on Pixabay */
  credit: { name: string; url: string };
  tags: string;
}

export interface SavedPhoto {
  photoId: string;
  width: number;
  height: number;
  credit: { name: string; url: string; source: 'pixabay' };
}

export class StockPhotoError extends Error {
  constructor(message: string, public statusCode = 502) {
    super(message);
    this.name = 'StockPhotoError';
  }
}

interface PixabayHit {
  id: number;
  pageURL: string;
  tags: string;
  webformatURL: string;
  largeImageURL: string;
  imageWidth: number;
  imageHeight: number;
  user: string;
  isAiGenerated?: boolean;
  isLowQuality?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED = 500;
const cache = new Map<string, { at: number; hits: PixabayHit[] }>();

export type Orientation = 'all' | 'horizontal' | 'vertical';

/** Where a saved photo lives in the media bucket; the user's id keeps photos private to them */
export const photoKey = (userId: string, photoId: string) => `designs/${userId}/photos/${photoId}.jpg`;

const PHOTO_ID = /^[0-9a-f-]{36}$/;

export class StockPhotoService {
  private s3: S3Client;
  private bucket: string;

  constructor(private get: typeof httpGet = httpGet, s3?: S3Client) {
    const cfg = getConfig();
    const s3Config: S3ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.s3 = s3 ?? new S3Client(s3Config);
    this.bucket = cfg.s3MediaBucket;
  }

  private async pixabay(params: Record<string, string>): Promise<PixabayHit[]> {
    const key = getConfig().pixabayApiKey;
    if (!key) throw new StockPhotoError('Stock photos aren’t set up yet', 503);
    const cacheKey = JSON.stringify(params);
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < DAY_MS) return hit.hits;

    const url = `https://pixabay.com/api/?${new URLSearchParams({ key, image_type: 'photo', safesearch: 'true', ...params })}`;
    let res: HttpResponse;
    try {
      res = await this.get(url, 10_000);
    } catch (error) {
      console.error('Pixabay request failed:', (error as Error).message);
      throw new StockPhotoError('Couldn’t reach the photo library. Please try again.');
    }
    if (res.status === 429) throw new StockPhotoError('Too many photo searches right now. Try again in a minute.', 429);
    if (res.status !== 200) throw new StockPhotoError('The photo library couldn’t search right now. Please try again.');
    const body = JSON.parse(res.body.toString('utf8')) as { hits?: PixabayHit[] };
    const hits = (body.hits ?? []).filter((h) => !h.isAiGenerated && !h.isLowQuality);
    if (cache.size >= MAX_CACHED) cache.delete(cache.keys().next().value as string);
    cache.set(cacheKey, { at: Date.now(), hits });
    return hits;
  }

  async search(query: string, { orientation = 'all', page = 1 }: { orientation?: Orientation; page?: number } = {}): Promise<StockPhoto[]> {
    const q = query.trim().slice(0, 100);
    if (!q) return [];
    const hits = await this.pixabay({
      q,
      orientation,
      page: String(Math.min(Math.max(1, page), 10)),
      per_page: '30',
    });
    return hits.map(toStockPhoto);
  }

  /** Copies a Pixabay photo into the user's storage so designs can use it */
  async save(userId: string, pixabayId: number): Promise<SavedPhoto> {
    const [hit] = await this.pixabay({ id: String(pixabayId) });
    if (!hit) throw new StockPhotoError('That photo isn’t available any more', 404);
    let res: HttpResponse;
    try {
      res = await this.get(hit.largeImageURL, 20_000);
    } catch {
      throw new StockPhotoError('Couldn’t download that photo. Please try again.');
    }
    if (res.status !== 200 || !res.body.length) throw new StockPhotoError('Couldn’t download that photo. Please try again.');
    const bytes = res.body;
    const photoId = randomUUID();
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: photoKey(userId, photoId), Body: bytes, ContentType: 'image/jpeg' })
    );
    // The large copy is at most 1280px on its long side
    const k = Math.min(1, 1280 / Math.max(hit.imageWidth, hit.imageHeight));
    return {
      photoId,
      width: Math.round(hit.imageWidth * k),
      height: Math.round(hit.imageHeight * k),
      credit: { name: hit.user, url: hit.pageURL, source: 'pixabay' },
    };
  }

  /** A saved photo's bytes, or null if it isn't the user's */
  async read(userId: string, photoId: string): Promise<Uint8Array | null> {
    if (!PHOTO_ID.test(photoId)) return null;
    try {
      const out = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: photoKey(userId, photoId) }));
      return out.Body ? await out.Body.transformToByteArray() : null;
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') return null;
      throw error;
    }
  }
}

function toStockPhoto(h: PixabayHit): StockPhoto {
  return {
    id: h.id,
    previewUrl: h.webformatURL,
    width: h.imageWidth,
    height: h.imageHeight,
    credit: { name: h.user, url: h.pageURL },
    tags: h.tags,
  };
}

/** For tests */
export function clearStockPhotoCache() {
  cache.clear();
}
