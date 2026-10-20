/**
 * Large video uploads (YouTube) as S3 multipart uploads.
 *
 * The browser uploads the parts straight to S3 with presigned URLs, so a
 * multi-gigabyte video never passes through the app server. The upload ID
 * stays on the server: the browser only sees its own media ID.
 */

import {
  S3Client,
  type S3ClientConfig,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { getConfig } from '@/lib/config';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { generateS3Key } from '@/lib/media/validation';
import {
  MediaRecord,
  YOUTUBE_VIDEO_CONTENT_TYPES,
  MAX_YOUTUBE_VIDEO_SIZE,
  MULTIPART_MIN_PART_SIZE,
  MULTIPART_MAX_PARTS,
  MULTIPART_PART_URL_EXPIRY,
} from '@/types/media';

export class VideoUploadError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode = 400
  ) {
    super(message);
    this.name = 'VideoUploadError';
  }
}

/** Most part URLs handed out in one request */
export const MAX_PART_URLS_PER_REQUEST = 50;

/**
 * Part size for a file: at least 16 MB, and big enough that the file fits
 * in S3's 10,000 parts. Rounded up to a whole MB.
 */
export function partSizeFor(fileSize: number): number {
  const mb = 1024 * 1024;
  const needed = Math.ceil(fileSize / MULTIPART_MAX_PARTS);
  return Math.max(MULTIPART_MIN_PART_SIZE, Math.ceil(needed / mb) * mb);
}

/** Keeps a filename safe to use in an S3 key */
function safeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[/\\]/g, '_')
    .replace(/[^\w.\- ]/g, '')
    .trim()
    .slice(-120);
  return cleaned || 'video';
}

function createS3Client(): S3Client {
  const cfg = getConfig();
  const s3Config: S3ClientConfig = { region: cfg.awsRegion };
  if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
    s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
  }
  return new S3Client(s3Config);
}

export class VideoUploadService {
  constructor(
    private s3: S3Client = createS3Client(),
    private mediaRepo: MediaRepository = new MediaRepository(),
    private bucket: string = getConfig().s3MediaBucket
  ) {}

  /** Starts an upload and records the video as 'uploading' */
  async start(
    userId: string,
    input: { filename: unknown; contentType: unknown; fileSize: unknown }
  ): Promise<{ mediaId: string; partSize: number; partCount: number }> {
    const { filename, contentType, fileSize } = input;
    if (typeof filename !== 'string' || !filename.trim()) {
      throw new VideoUploadError('filename is required', 'MISSING_FIELD');
    }
    if (typeof contentType !== 'string' || !(YOUTUBE_VIDEO_CONTENT_TYPES as readonly string[]).includes(contentType)) {
      throw new VideoUploadError('Upload an MP4, MOV or WebM video', 'INVALID_CONTENT_TYPE');
    }
    if (typeof fileSize !== 'number' || !Number.isInteger(fileSize) || fileSize <= 0) {
      throw new VideoUploadError('File size must be a positive integer', 'INVALID_FILE_SIZE');
    }
    if (fileSize > MAX_YOUTUBE_VIDEO_SIZE) {
      throw new VideoUploadError('Videos must be 10 GB or smaller', 'FILE_TOO_LARGE');
    }

    const mediaId = randomUUID();
    const s3Key = generateS3Key(userId, mediaId, safeFilename(filename));
    const created = await this.s3.send(
      new CreateMultipartUploadCommand({ Bucket: this.bucket, Key: s3Key, ContentType: contentType })
    );
    if (!created.UploadId) {
      throw new VideoUploadError('Could not start the upload', 'UPLOAD_START_FAILED', 502);
    }

    await this.mediaRepo.createMedia({
      mediaId,
      userId,
      s3Key,
      contentType,
      fileSize,
      mediaType: 'video',
      originalFilename: filename,
      createdAt: new Date().toISOString(),
      status: 'uploading',
      uploadId: created.UploadId,
    });

    const partSize = partSizeFor(fileSize);
    return { mediaId, partSize, partCount: Math.ceil(fileSize / partSize) };
  }

  /** Presigned PUT URLs for some of the parts */
  async partUrls(userId: string, mediaId: string, partNumbers: unknown): Promise<{ partNumber: number; url: string }[]> {
    const record = await this.uploadingRecord(userId, mediaId);
    const partCount = Math.ceil(record.fileSize / partSizeFor(record.fileSize));
    if (
      !Array.isArray(partNumbers) ||
      partNumbers.length === 0 ||
      partNumbers.length > MAX_PART_URLS_PER_REQUEST ||
      !partNumbers.every((n) => Number.isInteger(n) && n >= 1 && n <= partCount)
    ) {
      throw new VideoUploadError(`partNumbers must be 1–${MAX_PART_URLS_PER_REQUEST} part numbers between 1 and ${partCount}`, 'INVALID_PARTS');
    }
    return Promise.all(
      (partNumbers as number[]).map(async (partNumber) => ({
        partNumber,
        url: await getSignedUrl(
          this.s3,
          new UploadPartCommand({ Bucket: this.bucket, Key: record.s3Key, UploadId: record.uploadId, PartNumber: partNumber }),
          { expiresIn: MULTIPART_PART_URL_EXPIRY }
        ),
      }))
    );
  }

  /** Joins the parts into the final video and marks it ready */
  async complete(
    userId: string,
    mediaId: string,
    input: { parts: unknown; durationSeconds?: unknown; width?: unknown; height?: unknown }
  ): Promise<MediaRecord> {
    const record = await this.uploadingRecord(userId, mediaId);
    const partCount = Math.ceil(record.fileSize / partSizeFor(record.fileSize));
    const parts = input.parts;
    if (
      !Array.isArray(parts) ||
      parts.length !== partCount ||
      !parts.every(
        (p, i) => p && p.partNumber === i + 1 && typeof p.etag === 'string' && p.etag.length > 0 && p.etag.length < 200
      )
    ) {
      throw new VideoUploadError(`Send all ${partCount} parts in order, each with its ETag`, 'INVALID_PARTS');
    }

    await this.s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: record.s3Key,
        UploadId: record.uploadId,
        MultipartUpload: {
          Parts: (parts as { partNumber: number; etag: string }[]).map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      })
    );

    // Trust S3's size, not the browser's
    const head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: record.s3Key }));
    const fileSize = head.ContentLength ?? record.fileSize;

    const details = {
      fileSize,
      durationSeconds: positiveNumber(input.durationSeconds),
      width: positiveInteger(input.width),
      height: positiveInteger(input.height),
    };
    await this.mediaRepo.markVideoUploaded(mediaId, details);

    const { uploadId: _uploadId, ...rest } = record;
    void _uploadId;
    return { ...rest, ...withoutUndefined(details), status: 'ready' };
  }

  /** Cancels an upload: S3 drops the parts and the record goes */
  async abort(userId: string, mediaId: string): Promise<void> {
    const record = await this.uploadingRecord(userId, mediaId);
    await this.s3.send(
      new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: record.s3Key, UploadId: record.uploadId })
    );
    await this.mediaRepo.deleteMedia(mediaId);
  }

  private async uploadingRecord(userId: string, mediaId: string): Promise<MediaRecord & { uploadId: string }> {
    const record = await this.mediaRepo.getMediaById(mediaId);
    // Someone else's upload looks the same as a missing one
    if (!record || record.userId !== userId) {
      throw new VideoUploadError('Upload not found', 'UPLOAD_NOT_FOUND', 404);
    }
    if (record.status !== 'uploading' || !record.uploadId) {
      throw new VideoUploadError('This upload has already finished', 'UPLOAD_NOT_IN_PROGRESS', 409);
    }
    return record as MediaRecord & { uploadId: string };
  }
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 100_000 ? value : undefined;
}

function withoutUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}
