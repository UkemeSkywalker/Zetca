/**
 * Browser client for the /api/youtube routes
 */

import { requestUploadUrl, uploadFileToS3 } from '@/lib/api/mediaClient';
import type { YouTubeCategory, YouTubePlaylist } from '@/lib/services/youtubeClient';
import type { VideoDetailsInput, PublicYouTubeVideo } from '@/lib/models/youtubeVideo';
import type { VideoWriterRequest, VideoWriterResponse } from '@/lib/models/videoWriter';
import type { ScheduledPost } from '@/types/scheduler';

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

export async function listVideos(): Promise<PublicYouTubeVideo[]> {
  const { videos } = await call<{ videos: PublicYouTubeVideo[] }>('/api/youtube/videos');
  return videos;
}

/** Item id prefix that marks a Scheduler item as a YouTube video */
export const YOUTUBE_ITEM_PREFIX = 'youtube:';

export function isYouTubeItem(id: string): boolean {
  return id.startsWith(YOUTUBE_ITEM_PREFIX);
}

/** Where a video's status page lives */
export function videoPagePath(videoId: string): string {
  return `/dashboard/scheduler/youtube/${encodeURIComponent(videoId)}`;
}

const STATUS_FOR_POST: Record<PublicYouTubeVideo['status'], ScheduledPost['status']> = {
  queued: 'scheduled',
  waiting_quota: 'scheduled',
  uploading: 'publishing',
  scheduled: 'scheduled',
  published: 'published',
  failed: 'failed',
};

/**
 * A YouTube video as a Scheduler item, so it shows on the calendar, grid and
 * Publisher alongside posts. It sits on its publish time, or when it went up.
 */
export function videoToPost(input: PublicYouTubeVideo): ScheduledPost {
  // YouTube publishes a scheduled video at its time, before Zetca's next check
  const video: PublicYouTubeVideo =
    input.status === 'scheduled' && input.publishAt && new Date(input.publishAt) <= new Date() ? { ...input, status: 'published' } : input;
  const when = new Date(video.publishAt ?? video.uploadedAt ?? video.createdAt);
  const iso = when.toISOString();
  return {
    id: `${YOUTUBE_ITEM_PREFIX}${video.videoId}`,
    strategyId: '',
    copyId: '',
    userId: video.userId,
    content: video.details.title,
    platform: 'youtube',
    hashtags: [],
    scheduledDate: iso.slice(0, 10),
    scheduledTime: iso.slice(11, 16),
    status: STATUS_FOR_POST[video.status],
    strategyColor: '#FF0000',
    strategyLabel: 'YouTube video',
    createdAt: video.createdAt,
    updatedAt: video.updatedAt,
    mediaId: video.mediaId,
    mediaType: 'video',
    ...(video.status === 'failed' && video.error ? { lastError: video.error.message, lastErrorCode: video.error.code } : {}),
    ...(video.nextAttemptAt ? { nextAttemptAt: video.nextAttemptAt } : {}),
    youtube: { videoId: video.videoId, status: video.status, youtubeVideoId: video.youtubeVideoId },
  };
}

/** The user's YouTube videos as Scheduler items; empty if they can't be loaded */
export async function listVideoPosts(): Promise<ScheduledPost[]> {
  try {
    return (await listVideos()).map(videoToPost);
  } catch {
    return [];
  }
}

export type TranscriptStatus = 'extracting' | 'transcribing' | 'ready' | 'none' | 'failed';

export function getTranscriptStatus(mediaId: string) {
  return call<{ status: TranscriptStatus; language?: string }>(`/api/media/videos/${encodeURIComponent(mediaId)}/transcript`);
}

export async function suggestChapters(mediaId: string): Promise<{ seconds: number; title: string }[]> {
  const { chapters } = await call<{ chapters: { seconds: number; title: string }[] }>(
    `/api/media/videos/${encodeURIComponent(mediaId)}/chapters`,
    { method: 'POST' }
  );
  return chapters;
}

export type { KeywordInsight, TagInsight, Check } from '@/lib/youtube/research';
import type { KeywordInsight, TagInsight, Check } from '@/lib/youtube/research';

export interface ResearchInput {
  title: string;
  mediaId?: string;
  region: string;
  language: string;
  isShort: boolean;
}

export function researchVideo(input: ResearchInput) {
  return call<{ keywords: KeywordInsight[]; tags: TagInsight[]; basedOn: 'transcript' | 'title' | 'both' }>('/api/youtube/research', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function writeSuggestions(input: ResearchInput & { keywords: KeywordInsight[]; chaptersOk: boolean | null }) {
  return call<{
    titles: { text: string; score: number; checks: Check[] }[];
    description: { text: string; score: number; checks: Check[] } | null;
  }>('/api/youtube/suggestions', { method: 'POST', body: JSON.stringify(input) });
}

export function updateVideo(videoId: string, details: VideoDetailsInput) {
  return call<{ video: PublicYouTubeVideo; warnings: string[] }>(`/api/youtube/videos/${encodeURIComponent(videoId)}`, {
    method: 'PUT',
    body: JSON.stringify({ details }),
  });
}

export function removeVideo(videoId: string) {
  return call<{ onYouTube: boolean }>(`/api/youtube/videos/${encodeURIComponent(videoId)}`, { method: 'DELETE' });
}
