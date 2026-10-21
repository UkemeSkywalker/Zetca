/**
 * Browser client for the /api/youtube routes
 */

import { requestUploadUrl, uploadFileToS3 } from '@/lib/api/mediaClient';
import type { YouTubeCategory, YouTubePlaylist } from '@/lib/services/youtubeClient';
import type { VideoDetailsInput, PublicYouTubeVideo } from '@/lib/models/youtubeVideo';
import type { VideoWriterRequest, VideoWriterResponse } from '@/lib/models/videoWriter';

export type { YouTubeCategory, YouTubePlaylist };

export class YouTubeRequestError extends Error {
  constructor(
    message: string,
    public code?: string,
    public fields?: Record<string, string>
  ) {
    super(message);
    this.name = 'YouTubeRequestError';
  }
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: headers(), credentials: 'include' });
  } catch {
    throw new YouTubeRequestError('Couldn’t reach Zetca. Check your connection and try again.', 'NETWORK');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new YouTubeRequestError(body.error || `Request failed (${res.status})`, body.code, body.fields);
  return body as T;
}

/** The browser's country, for YouTube's category list (e.g. "NG") */
export function browserRegion(): string {
  const locale = typeof navigator !== 'undefined' ? navigator.language : '';
  const region = locale.split('-')[1];
  return region && /^[A-Za-z]{2}$/.test(region) ? region.toUpperCase() : 'US';
}

export function getOptions(region = browserRegion()) {
  return call<{ playlists: YouTubePlaylist[]; categories: YouTubeCategory[] }>(`/api/youtube/options?region=${region}`);
}

export async function createPlaylist(title: string): Promise<YouTubePlaylist> {
  const { playlist } = await call<{ playlist: YouTubePlaylist }>('/api/youtube/playlists', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return playlist;
}

export function uploadCaptions(filename: string, content: string) {
  return call<{ key: string; filename: string }>('/api/youtube/captions', {
    method: 'POST',
    body: JSON.stringify({ filename, content }),
  });
}

/** Uploads a thumbnail image and returns its media ID */
export async function uploadThumbnail(image: Blob, filename: string): Promise<string> {
  const file = image instanceof File ? image : new File([image], filename, { type: image.type || 'image/jpeg' });
  const { uploadUrl, mediaId } = await requestUploadUrl(file.type, file.name, file.size);
  await uploadFileToS3(uploadUrl, file);
  return mediaId;
}

export async function scheduleVideo(mediaId: string, details: VideoDetailsInput): Promise<PublicYouTubeVideo> {
  const { video } = await call<{ video: PublicYouTubeVideo }>('/api/youtube/videos', {
    method: 'POST',
    body: JSON.stringify({ mediaId, details }),
  });
  return video;
}

export function writeVideoCopy(input: VideoWriterRequest) {
  return call<VideoWriterResponse>('/api/youtube/write', { method: 'POST', body: JSON.stringify(input) });
}

export async function getVideo(videoId: string): Promise<PublicYouTubeVideo> {
  const { video } = await call<{ video: PublicYouTubeVideo }>(`/api/youtube/videos/${encodeURIComponent(videoId)}`);
  return video;
}

export async function retryVideo(videoId: string): Promise<PublicYouTubeVideo> {
  const { video } = await call<{ video: PublicYouTubeVideo }>(`/api/youtube/videos/${encodeURIComponent(videoId)}/retry`, {
    method: 'POST',
  });
  return video;
}
