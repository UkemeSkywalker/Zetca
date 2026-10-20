/**
 * Uploads a large video straight to S3 in parts (see /api/media/videos).
 *
 * Four parts upload at a time, each retried a few times, and progress is
 * reported in bytes as the parts go up.
 */

import type { MediaRecord } from '@/types/media';

export interface VideoMetadata {
  durationSeconds?: number;
  width?: number;
  height?: number;
}

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
}

export class VideoUploadClientError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'VideoUploadClientError';
  }
}

const PARALLEL_PARTS = 4;
const URL_BATCH = 20;
const PART_ATTEMPTS = 4;

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function api<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: authHeaders(), credentials: 'include' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new VideoUploadClientError(body.error || `Upload request failed (${res.status})`, body.code);
  }
  return body as T;
}

/** Reads duration and size from the file in the browser */
export function readVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    const done = (meta: VideoMetadata) => {
      URL.revokeObjectURL(url);
      resolve(meta);
    };
    video.onloadedmetadata = () =>
      done({
        durationSeconds: Number.isFinite(video.duration) ? video.duration : undefined,
        width: video.videoWidth || undefined,
        height: video.videoHeight || undefined,
      });
    // Some formats (e.g. some MOVs) can't be read here; upload them anyway
    video.onerror = () => done({});
    video.src = url;
  });
}

/** YouTube treats square or vertical videos up to 3 minutes as Shorts */
export function isShort(meta: VideoMetadata): boolean {
  if (!meta.width || !meta.height || !meta.durationSeconds) return false;
  return meta.height >= meta.width && meta.durationSeconds <= 180;
}

function putPart(
  url: string,
  blob: Blob,
  onProgress: (loaded: number) => void,
  signal: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      const etag = xhr.getResponseHeader('ETag');
      if (xhr.status >= 200 && xhr.status < 300 && etag) resolve(etag);
      else reject(new VideoUploadClientError(`Part upload failed (${xhr.status})`));
    };
    xhr.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new VideoUploadClientError('Network error while uploading'));
    };
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));
    xhr.send(blob);
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function uploadVideo(
  file: File,
  options: {
    metadata?: VideoMetadata;
    onStarted?: (mediaId: string) => void;
    onProgress?: (progress: UploadProgress) => void;
    signal?: AbortSignal;
  } = {}
): Promise<MediaRecord> {
  const signal = options.signal ?? new AbortController().signal;
  const { mediaId, partSize, partCount } = await api<{ mediaId: string; partSize: number; partCount: number }>(
    '/api/media/videos',
    {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type, fileSize: file.size }),
    }
  );
  options.onStarted?.(mediaId);

  const progress = new Array<number>(partCount).fill(0);
  const report = () =>
    options.onProgress?.({ uploadedBytes: progress.reduce((a, b) => a + b, 0), totalBytes: file.size });

  const urls = new Map<number, string>();
  const fetchUrls = async (from: number) => {
    const partNumbers: number[] = [];
    for (let n = from; n <= Math.min(partCount, from + URL_BATCH - 1); n++) partNumbers.push(n);
    const { parts } = await api<{ parts: { partNumber: number; url: string }[] }>(
      `/api/media/videos/${mediaId}/parts`,
      { method: 'POST', body: JSON.stringify({ partNumbers }) }
    );
    for (const p of parts) urls.set(p.partNumber, p.url);
  };
  // One batch request at a time, shared by the workers
  let pendingBatch: Promise<void> | null = null;
  const urlFor = async (partNumber: number, refresh = false) => {
    if (refresh) urls.delete(partNumber);
    while (!urls.has(partNumber)) {
      if (!pendingBatch) pendingBatch = fetchUrls(partNumber).finally(() => (pendingBatch = null));
      await pendingBatch;
    }
    return urls.get(partNumber)!;
  };

  const etags = new Array<string>(partCount);
  let next = 1;
  const worker = async () => {
    while (next <= partCount) {
      const partNumber = next++;
      const start = (partNumber - 1) * partSize;
      const blob = file.slice(start, Math.min(start + partSize, file.size));
      for (let attempt = 1; ; attempt++) {
        if (signal.aborted) throw new DOMException('Upload cancelled', 'AbortError');
        try {
          // A retry gets a fresh URL in case the old one expired
          const url = await urlFor(partNumber, attempt > 1);
          etags[partNumber - 1] = await putPart(
            url,
            blob,
            (loaded) => {
              progress[partNumber - 1] = loaded;
              report();
            },
            signal
          );
          progress[partNumber - 1] = blob.size;
          report();
          break;
        } catch (error) {
          if ((error as Error).name === 'AbortError' || attempt >= PART_ATTEMPTS) throw error;
          progress[partNumber - 1] = 0;
          report();
          await wait(1000 * 2 ** (attempt - 1));
        }
      }
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(PARALLEL_PARTS, partCount) }, worker));
    const { media } = await api<{ media: MediaRecord }>(`/api/media/videos/${mediaId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        parts: etags.map((etag, i) => ({ partNumber: i + 1, etag })),
        ...(options.metadata ?? {}),
      }),
    });
    return media;
  } catch (error) {
    // Free the parts already in S3; the bucket's lifecycle rule is the backstop
    api(`/api/media/videos/${mediaId}`, { method: 'DELETE' }).catch(() => {});
    throw error;
  }
}
