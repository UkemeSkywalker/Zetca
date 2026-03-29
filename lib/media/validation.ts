import {
  ALLOWED_CONTENT_TYPES,
  AllowedContentType,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from '@/types/media';

export function isAllowedContentType(contentType: string): boolean {
  return (ALLOWED_CONTENT_TYPES as readonly string[]).includes(contentType);
}

export function getMediaType(contentType: string): 'image' | 'video' {
  if (contentType.startsWith('video/')) {
    return 'video';
  }
  return 'image';
}

export function getMaxFileSize(mediaType: 'image' | 'video'): number {
  return mediaType === 'video' ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
}

export function validateFileSize(
  fileSize: number,
  mediaType: 'image' | 'video'
): boolean {
  if (!Number.isInteger(fileSize) || fileSize <= 0) {
    return false;
  }
  return fileSize <= getMaxFileSize(mediaType);
}

export function generateS3Key(
  userId: string,
  mediaId: string,
  filename: string
): string {
  return `${userId}/${mediaId}/${filename}`;
}
