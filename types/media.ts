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

export const UPLOAD_URL_EXPIRY_IMAGE = 5 * 60; // 300 seconds (5 minutes)
export const UPLOAD_URL_EXPIRY_VIDEO = 15 * 60; // 900 seconds (15 minutes)
export const DOWNLOAD_URL_EXPIRY = 60 * 60; // 3600 seconds (60 minutes)
