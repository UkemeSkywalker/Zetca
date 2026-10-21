/**
 * YouTube Data API calls for uploading a video and finishing it off
 * (thumbnail, playlists, captions).
 *
 * Videos use YouTube's resumable upload: Zetca opens an upload session, then
 * sends the file in pieces. If a piece fails, the session says how much
 * arrived, and the upload carries on from there.
 */

import { YouTubeApiError, YouTubeAuthError } from './youtubeClient';
import type { VideoDetails } from '@/lib/models/youtubeVideo';

const UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3';
const API_URL = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 120_000;

/** Upload pieces must be a multiple of 256 KiB; 8 MiB keeps memory low */
export const UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024;

async function send(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Turns a failed response into the right error */
async function failure(res: Response, what: string): Promise<never> {
  if (res.status === 401) throw new YouTubeAuthError('YouTube access was revoked or expired', 'token_revoked');
  const data = await res.json().catch(() => ({}));
  const reason = data?.error?.errors?.[0]?.reason as string | undefined;
  throw new YouTubeApiError(data?.error?.message || `${what} failed: ${res.status}`, res.status, reason);
}

/** The video resource YouTube expects, from the details form */
export function buildVideoResource(details: VideoDetails, publishAt: string | undefined) {
  const scheduled = !!publishAt;
  const localizations = Object.fromEntries(
    details.translations.map((t) => [t.language, { title: t.title, description: t.description }])
  );
  return {
    snippet: {
      title: details.title,
      description: details.description,
      tags: details.tags,
      categoryId: details.categoryId,
      ...(details.language ? { defaultLanguage: details.language, defaultAudioLanguage: details.language } : {}),
    },
    status: {
      // A scheduled video goes up private, and YouTube makes it public at publishAt
      privacyStatus: scheduled ? 'private' : details.privacyStatus,
      ...(scheduled ? { publishAt } : {}),
      selfDeclaredMadeForKids: details.madeForKids,
      license: details.license,
      embeddable: details.embeddable,
      publicStatsViewable: details.publicStatsViewable,
      containsSyntheticMedia: details.alteredContent,
    },
    ...(details.recordingDate ? { recordingDetails: { recordingDate: `${details.recordingDate}T00:00:00.000Z` } } : {}),
    ...(Object.keys(localizations).length ? { localizations } : {}),
    // Sent only when there is one, so videos without it don't depend on this newer part
    ...(details.paidPromotion ? { paidProductPlacementDetails: { hasPaidProductPlacement: true } } : {}),
  };
}

/** Parts of the video resource that are being set */
function resourceParts(resource: ReturnType<typeof buildVideoResource>): string {
  return Object.keys(resource).join(',');
}

/** Opens an upload session and returns its URL */
export async function startUpload(
  accessToken: string,
  resource: ReturnType<typeof buildVideoResource>,
  file: { size: number; contentType: string },
  notifySubscribers: boolean
): Promise<string> {
  const url =
    `${UPLOAD_URL}/videos?uploadType=resumable&part=${resourceParts(resource)}` +
    `&notifySubscribers=${notifySubscribers ? 'true' : 'false'}`;
  const res = await send(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(file.size),
      'X-Upload-Content-Type': file.contentType,
    },
    body: JSON.stringify(resource),
  });
  if (!res.ok) await failure(res, 'Starting the upload');
  const location = res.headers.get('location');
  if (!location?.startsWith('https://')) throw new YouTubeApiError('YouTube returned no upload session', 502);
  return location;
}

export type UploadProgress = { done: false; nextByte: number } | { done: true; youtubeVideoId: string };

/** Reads where an upload stands from YouTube's response */
async function progressFrom(res: Response, what: string): Promise<UploadProgress> {
  if (res.status === 200 || res.status === 201) {
    const video = (await res.json()) as { id?: string };
    if (!video.id) throw new YouTubeApiError('YouTube returned no video ID', 502);
    return { done: true, youtubeVideoId: video.id };
  }
  if (res.status === 308) {
    // "Range: bytes=0-12345" means bytes up to 12345 arrived; no header means none did
    const range = res.headers.get('range');
    const end = range ? Number(range.split('-')[1]) : -1;
    return { done: false, nextByte: end + 1 };
  }
  if (res.status === 404 || res.status === 410) {
    throw new YouTubeApiError('The upload session expired', res.status, 'sessionExpired');
  }
  return failure(res, what);
}

/** Sends one piece of the file, starting at byte `start` */
export async function uploadChunk(
  accessToken: string,
  sessionUri: string,
  chunk: Uint8Array,
  start: number,
  total: number
): Promise<UploadProgress> {
  const end = start + chunk.byteLength - 1;
  const res = await send(sessionUri, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Length': String(chunk.byteLength),
      'Content-Range': `bytes ${start}-${end}/${total}`,
    },
    body: chunk as unknown as BodyInit,
  });
  return progressFrom(res, 'Uploading the video');
}

/** Asks how much of an interrupted upload arrived */
export async function uploadStatus(accessToken: string, sessionUri: string, total: number): Promise<UploadProgress> {
  const res = await send(sessionUri, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Length': '0', 'Content-Range': `bytes */${total}` },
  });
  return progressFrom(res, 'Checking the upload');
}

export async function setThumbnail(accessToken: string, youtubeVideoId: string, image: Uint8Array, contentType: string) {
  const res = await send(`${UPLOAD_URL}/thumbnails/set?videoId=${encodeURIComponent(youtubeVideoId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': contentType },
    body: image as unknown as BodyInit,
  });
  if (!res.ok) await failure(res, 'Setting the thumbnail');
}

export async function addToPlaylist(accessToken: string, playlistId: string, youtubeVideoId: string) {
  const res = await send(`${API_URL}/playlistItems?part=snippet`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: youtubeVideoId } } }),
  });
  if (!res.ok) await failure(res, 'Adding to the playlist');
}

/** Uploads a captions file (multipart: JSON metadata, then the file) */
export async function insertCaptions(accessToken: string, youtubeVideoId: string, language: string, file: Uint8Array) {
  const boundary = `zetca${Date.now().toString(36)}`;
  const metadata = JSON.stringify({ snippet: { videoId: youtubeVideoId, language, name: '', isDraft: false } });
  const head = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`
  );
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.byteLength + file.byteLength + tail.byteLength);
  body.set(head, 0);
  body.set(file, head.byteLength);
  body.set(tail, head.byteLength + file.byteLength);
  const res = await send(`${UPLOAD_URL}/captions?part=snippet&uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: body as unknown as BodyInit,
  });
  if (!res.ok) await failure(res, 'Adding captions');
}
