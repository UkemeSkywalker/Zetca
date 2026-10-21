/**
 * Google OAuth and YouTube Data API calls used to connect a user's channel.
 * (Uploading lives with the publisher; this covers sign-in and channel info.)
 */

import { getConfig } from '../config';

/** Upload videos, and manage playlists, thumbnails, captions and video settings */
/** Pages the connect flow may return to (anything else goes to the profile) */
export const YOUTUBE_RETURN_PATHS = ['/dashboard/profile', '/dashboard/scheduler/youtube/new'] as const;
export const YOUTUBE_RETURN_COOKIE = 'youtube_oauth_return';

export const YOUTUBE_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const TIMEOUT_MS = 15_000;

export class YouTubeAuthError extends Error {
  constructor(
    message: string,
    /** Short code for the Profile page's message, e.g. "missing_scope" */
    public code: string
  ) {
    super(message);
    this.name = 'YouTubeAuthError';
  }
}

export interface YouTubeChannel {
  id: string;
  title: string;
  customUrl?: string;
  thumbnailUrl?: string;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Google's consent page. offline + consent so Google always returns a refresh token. */
export function buildAuthUrl(state: string): string {
  const cfg = getConfig();
  const url = new URL(AUTH_URL);
  url.searchParams.set('client_id', cfg.youtubeClientId);
  url.searchParams.set('redirect_uri', cfg.youtubeRedirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', YOUTUBE_SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

/** Swap the callback's code for tokens; insists on a refresh token and both scopes */
export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string; scopes: string[] }> {
  const cfg = getConfig();
  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: cfg.youtubeClientId,
      client_secret: cfg.youtubeClientSecret,
      redirect_uri: cfg.youtubeRedirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new YouTubeAuthError(`Google token exchange failed: ${res.status}`, 'exchange_failed');
  const data = (await res.json()) as { access_token?: string; refresh_token?: string; scope?: string };
  if (!data.access_token) throw new YouTubeAuthError('Google returned no access token', 'exchange_failed');
  if (!data.refresh_token) throw new YouTubeAuthError('Google returned no refresh token', 'exchange_failed');
  // Google lets people untick permissions on the consent screen; Zetca needs both
  const scopes = (data.scope ?? '').split(' ').filter(Boolean);
  if (!YOUTUBE_SCOPES.every((s) => scopes.includes(s))) {
    await revokeToken(data.refresh_token).catch(() => {});
    throw new YouTubeAuthError('Not all YouTube permissions were granted', 'missing_scope');
  }
  return { accessToken: data.access_token, refreshToken: data.refresh_token, scopes };
}

/** A fresh access token from a stored refresh token */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const cfg = getConfig();
  const res = await fetchWithTimeout(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: cfg.youtubeClientId,
      client_secret: cfg.youtubeClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (res.status === 400 || res.status === 401) {
    // invalid_grant: the user revoked access, or the token expired
    throw new YouTubeAuthError('YouTube access was revoked or expired', 'token_revoked');
  }
  if (!res.ok) throw new YouTubeAuthError(`Google token refresh failed: ${res.status}`, 'refresh_failed');
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new YouTubeAuthError('Google returned no access token', 'refresh_failed');
  return data.access_token;
}

/** The channel the user picked on Google's consent screen */
export async function getMyChannel(accessToken: string): Promise<YouTubeChannel> {
  const url = `${CHANNELS_URL}?part=snippet&mine=true`;
  const res = await fetchWithTimeout(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new YouTubeAuthError(`YouTube channel lookup failed: ${res.status}`, 'exchange_failed');
  const data = (await res.json()) as {
    items?: { id: string; snippet?: { title?: string; customUrl?: string; thumbnails?: Record<string, { url?: string }> } }[];
  };
  const item = data.items?.[0];
  if (!item) throw new YouTubeAuthError('This Google account has no YouTube channel', 'no_channel');
  const thumbs = item.snippet?.thumbnails ?? {};
  const thumbnailUrl = thumbs.medium?.url ?? thumbs.default?.url;
  return {
    id: item.id,
    title: (item.snippet?.title ?? 'YouTube channel').slice(0, 200),
    ...(item.snippet?.customUrl ? { customUrl: item.snippet.customUrl.slice(0, 100) } : {}),
    ...(thumbnailUrl?.startsWith('https://') ? { thumbnailUrl } : {}),
  };
}

/** Revoke Zetca's access at Google (best effort; the stored token is deleted either way) */
export async function revokeToken(token: string): Promise<void> {
  await fetchWithTimeout(REVOKE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  });
}

const API_URL = 'https://www.googleapis.com/youtube/v3';

/** A YouTube Data API error (not a sign-in problem) */
export class YouTubeApiError extends Error {
  constructor(
    message: string,
    public status: number,
    /** YouTube's reason, e.g. "quotaExceeded" */
    public reason?: string
  ) {
    super(message);
    this.name = 'YouTubeApiError';
  }
}

async function youtubeApi<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (res.status === 401) throw new YouTubeAuthError('YouTube access was revoked or expired', 'token_revoked');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const reason = data?.error?.errors?.[0]?.reason as string | undefined;
    throw new YouTubeApiError(data?.error?.message || `YouTube request failed: ${res.status}`, res.status, reason);
  }
  return data as T;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  itemCount: number;
  privacyStatus?: string;
}

/** The channel's playlists (up to 200) */
export async function listMyPlaylists(accessToken: string): Promise<YouTubePlaylist[]> {
  const playlists: YouTubePlaylist[] = [];
  let pageToken = '';
  for (let page = 0; page < 4; page++) {
    const data = await youtubeApi<{
      items?: { id: string; snippet?: { title?: string }; contentDetails?: { itemCount?: number }; status?: { privacyStatus?: string } }[];
      nextPageToken?: string;
    }>(accessToken, `/playlists?part=snippet,contentDetails,status&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`);
    for (const item of data.items ?? []) {
      playlists.push({
        id: item.id,
        title: (item.snippet?.title ?? 'Untitled playlist').slice(0, 150),
        itemCount: item.contentDetails?.itemCount ?? 0,
        privacyStatus: item.status?.privacyStatus,
      });
    }
    if (!data.nextPageToken) break;
    pageToken = encodeURIComponent(data.nextPageToken);
  }
  return playlists;
}

export async function createPlaylist(
  accessToken: string,
  input: { title: string; privacyStatus: 'public' | 'unlisted' | 'private' }
): Promise<YouTubePlaylist> {
  const data = await youtubeApi<{ id: string; snippet?: { title?: string }; status?: { privacyStatus?: string } }>(
    accessToken,
    '/playlists?part=snippet,status',
    {
      method: 'POST',
      body: JSON.stringify({ snippet: { title: input.title }, status: { privacyStatus: input.privacyStatus } }),
    }
  );
  return { id: data.id, title: data.snippet?.title ?? input.title, itemCount: 0, privacyStatus: data.status?.privacyStatus };
}

export interface YouTubeCategory {
  id: string;
  title: string;
}

/** Categories a video can be put in, for a region (e.g. "US", "NG") */
export async function listVideoCategories(accessToken: string, regionCode: string): Promise<YouTubeCategory[]> {
  const data = await youtubeApi<{ items?: { id: string; snippet?: { title?: string; assignable?: boolean } }[] }>(
    accessToken,
    `/videoCategories?part=snippet&regionCode=${encodeURIComponent(regionCode)}`
  );
  return (data.items ?? [])
    .filter((c) => c.snippet?.assignable)
    .map((c) => ({ id: c.id, title: c.snippet?.title ?? c.id }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

/** The top videos YouTube returns for a search, with their views and tags */
export async function searchTopVideos(
  accessToken: string,
  query: string,
  opts: { regionCode: string; language: string; max?: number }
): Promise<import('@/lib/youtube/research').TopVideo[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: String(opts.max ?? 20),
    q: query,
    regionCode: opts.regionCode,
    relevanceLanguage: opts.language.split('-')[0],
  });
  const search = await youtubeApi<{ items?: { id?: { videoId?: string } }[] }>(accessToken, `/search?${params}`);
  const ids = (search.items ?? []).map((i) => i.id?.videoId).filter((id): id is string => !!id);
  if (!ids.length) return [];
  const details = await youtubeApi<{
    items?: {
      id: string;
      snippet?: { title?: string; publishedAt?: string; tags?: string[]; channelTitle?: string };
      statistics?: { viewCount?: string };
    }[];
  }>(accessToken, `/videos?part=snippet,statistics&id=${ids.join(',')}`);
  return (details.items ?? []).map((v) => ({
    id: v.id,
    title: v.snippet?.title ?? '',
    views: Number(v.statistics?.viewCount ?? 0),
    publishedAt: v.snippet?.publishedAt ?? new Date(0).toISOString(),
    tags: v.snippet?.tags ?? [],
    channelTitle: v.snippet?.channelTitle ?? '',
  }));
}
