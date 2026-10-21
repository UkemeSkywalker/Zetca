export interface MediaRecord {
  mediaId: string;
  userId: string;
  s3Key: string;
  contentType: string;
  fileSize: number;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  originalFilename: string;
  createdAt: string;
  /** Large videos upload in parts; until then they're 'uploading'. Missing = ready. */
  status?: 'uploading' | 'ready';
  /** S3 multipart upload ID, kept server-side while the parts upload */
  uploadId?: string;
  durationSeconds?: number;
  /** Speech-to-text of a video, used for chapters and suggestions */
  transcript?: TranscriptState;
}

export type TranscriptStatus = 'extracting' | 'transcribing' | 'ready' | 'none' | 'failed';

export interface TranscriptState {
  status: TranscriptStatus;
  /** One AWS Transcribe job per audio piece, with where that piece starts in the video */
  jobs?: { name: string; offsetSeconds: number }[];
  /** S3 key of the finished transcript (JSON) */
  key?: string;
  language?: string;
  error?: string;
  startedAt: string;
  updatedAt: string;
}

/** A finished transcript: sentences with their times in the video */
export interface Transcript {
  language: string;
  segments: { start: number; end: number; text: string }[];
}

export type AllowedContentType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/gif'
  | 'image/webp'
  | 'video/mp4'
  | 'video/quicktime'
  | 'video/webm';

export const ALLOWED_CONTENT_TYPES: AllowedContentType[] = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

// YouTube videos upload straight to S3 in parts, so they can be much larger
export const YOUTUBE_VIDEO_CONTENT_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export const MAX_YOUTUBE_VIDEO_SIZE = 10 * 1024 * 1024 * 1024; // 10 GB
export const MULTIPART_MIN_PART_SIZE = 16 * 1024 * 1024; // 16 MB
export const MULTIPART_MAX_PARTS = 10_000; // S3's limit
export const MULTIPART_PART_URL_EXPIRY = 60 * 60; // 1 hour per batch of part URLs

export const UPLOAD_URL_EXPIRY_IMAGE = 5 * 60; // 300 seconds (5 minutes)
export const UPLOAD_URL_EXPIRY_VIDEO = 15 * 60; // 900 seconds (15 minutes)
export const DOWNLOAD_URL_EXPIRY = 60 * 60; // 3600 seconds (60 minutes)
