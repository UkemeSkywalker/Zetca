/**
 * @jest-environment node
 */

process.env.AWS_ACCESS_KEY_ID = 'AKIATEST';
process.env.AWS_SECRET_ACCESS_KEY = 'secret';

import {
  S3Client,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { VideoUploadService, partSizeFor } from '@/lib/services/videoUploadService';
import type { MediaRepository } from '@/lib/db/mediaRepository';
import type { MediaRecord } from '@/types/media';
import { isShort } from '@/lib/api/videoUploadClient';

const MB = 1024 * 1024;
const GB = 1024 * MB;

function setup(record?: Partial<MediaRecord>) {
  const s3 = new S3Client({ region: 'us-east-1', credentials: { accessKeyId: 'AKIATEST', secretAccessKey: 'secret' } });
  const send = jest.spyOn(s3, 'send').mockImplementation(async (command: unknown) => {
    if (command instanceof CreateMultipartUploadCommand) return { UploadId: 'upload-1' };
    if (command instanceof HeadObjectCommand) return { ContentLength: 40 * MB };
    return {};
  });
  const repo = {
    createMedia: jest.fn(async (r: MediaRecord) => r),
    getMediaById: jest.fn(async () =>
      record
        ? ({
            mediaId: 'm1',
            userId: 'user-1',
            s3Key: 'user-1/m1/clip.mp4',
            contentType: 'video/mp4',
            fileSize: 40 * MB,
            mediaType: 'video',
            originalFilename: 'clip.mp4',
            createdAt: '2026-10-20T00:00:00.000Z',
            status: 'uploading',
            uploadId: 'upload-1',
            ...record,
          } as MediaRecord)
        : null
    ),
    markVideoUploaded: jest.fn(async () => undefined),
    deleteMedia: jest.fn(async () => undefined),
  };
  const service = new VideoUploadService(s3, repo as unknown as MediaRepository, 'bucket');
  return { service, send, repo };
}

describe('partSizeFor', () => {
  it('uses 16 MB parts for ordinary videos', () => {
    expect(partSizeFor(40 * MB)).toBe(16 * MB);
    expect(partSizeFor(100 * GB / 1000)).toBe(16 * MB);
  });

  it('grows the parts so a 10 GB file fits in S3’s 10,000 parts', () => {
    const size = partSizeFor(10 * GB);
    expect(size % MB).toBe(0);
    expect(Math.ceil((10 * GB) / size)).toBeLessThanOrEqual(10_000);
  });
});

describe('VideoUploadService.start', () => {
  it('starts a multipart upload and records the video as uploading', async () => {
    const { service, send, repo } = setup();
    const result = await service.start('user-1', { filename: 'My clip.mp4', contentType: 'video/mp4', fileSize: 40 * MB });
    expect(result).toEqual({ mediaId: expect.any(String), partSize: 16 * MB, partCount: 3 });
    expect(send.mock.calls[0][0]).toBeInstanceOf(CreateMultipartUploadCommand);
    expect(repo.createMedia).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', status: 'uploading', uploadId: 'upload-1', mediaType: 'video' })
    );
  });

  it('keeps the S3 key safe whatever the filename', async () => {
    const { service, repo } = setup();
    await service.start('user-1', { filename: '../../etc/pa?ss.mp4', contentType: 'video/mp4', fileSize: MB });
    const key = repo.createMedia.mock.calls[0][0].s3Key;
    expect(key.startsWith('user-1/')).toBe(true);
    expect(key.split('/')).toHaveLength(3);
    expect(key).not.toContain('?');
  });

  it.each([
    [{ filename: 'a.mp4', contentType: 'image/png', fileSize: MB }, 'INVALID_CONTENT_TYPE'],
    [{ filename: 'a.mp4', contentType: 'video/mp4', fileSize: 11 * GB }, 'FILE_TOO_LARGE'],
    [{ filename: 'a.mp4', contentType: 'video/mp4', fileSize: -1 }, 'INVALID_FILE_SIZE'],
    [{ filename: '', contentType: 'video/mp4', fileSize: MB }, 'MISSING_FIELD'],
  ])('rejects bad input %#', async (input, code) => {
    const { service, send } = setup();
    await expect(service.start('user-1', input)).rejects.toMatchObject({ code });
    expect(send).not.toHaveBeenCalled();
  });
});

describe('VideoUploadService.partUrls', () => {
  it('signs a URL for each requested part', async () => {
    const { service } = setup({});
    const parts = await service.partUrls('user-1', 'm1', [1, 2, 3]);
    expect(parts.map((p) => p.partNumber)).toEqual([1, 2, 3]);
    const url = new URL(parts[1].url);
    expect(url.searchParams.get('partNumber')).toBe('2');
    expect(url.searchParams.get('uploadId')).toBe('upload-1');
  });

  it('refuses part numbers outside the upload', async () => {
    const { service } = setup({});
    await expect(service.partUrls('user-1', 'm1', [4])).rejects.toMatchObject({ code: 'INVALID_PARTS' });
    await expect(service.partUrls('user-1', 'm1', [])).rejects.toMatchObject({ code: 'INVALID_PARTS' });
  });

  it('treats someone else’s upload as not found', async () => {
    const { service } = setup({ userId: 'someone-else' });
    await expect(service.partUrls('user-1', 'm1', [1])).rejects.toMatchObject({ code: 'UPLOAD_NOT_FOUND', statusCode: 404 });
  });

  it('refuses a finished upload', async () => {
    const { service } = setup({ status: 'ready', uploadId: undefined });
    await expect(service.partUrls('user-1', 'm1', [1])).rejects.toMatchObject({ statusCode: 409 });
  });
});

describe('VideoUploadService.complete', () => {
  const parts = [1, 2, 3].map((n) => ({ partNumber: n, etag: `"etag-${n}"` }));

  it('joins the parts and marks the video ready with its details', async () => {
    const { service, send, repo } = setup({});
    const media = await service.complete('user-1', 'm1', { parts, durationSeconds: 42.123, width: 1080, height: 1920 });
    const complete = send.mock.calls.map((c) => c[0]).find((c) => c instanceof CompleteMultipartUploadCommand) as CompleteMultipartUploadCommand;
    expect(complete.input.MultipartUpload?.Parts).toEqual([
      { PartNumber: 1, ETag: '"etag-1"' },
      { PartNumber: 2, ETag: '"etag-2"' },
      { PartNumber: 3, ETag: '"etag-3"' },
    ]);
    expect(repo.markVideoUploaded).toHaveBeenCalledWith('m1', { fileSize: 40 * MB, durationSeconds: 42.12, width: 1080, height: 1920 });
    expect(media).toMatchObject({ status: 'ready', durationSeconds: 42.12 });
    expect(media).not.toHaveProperty('uploadId');
  });

  it('needs every part, in order', async () => {
    const { service } = setup({});
    await expect(service.complete('user-1', 'm1', { parts: parts.slice(0, 2) })).rejects.toMatchObject({ code: 'INVALID_PARTS' });
    await expect(service.complete('user-1', 'm1', { parts: [parts[1], parts[0], parts[2]] })).rejects.toMatchObject({
      code: 'INVALID_PARTS',
    });
  });

  it('ignores nonsense metadata', async () => {
    const { service, repo } = setup({});
    await service.complete('user-1', 'm1', { parts, durationSeconds: 'long', width: -5, height: 1.5 });
    expect(repo.markVideoUploaded).toHaveBeenCalledWith('m1', {
      fileSize: 40 * MB,
      durationSeconds: undefined,
      width: undefined,
      height: undefined,
    });
  });
});

describe('VideoUploadService.abort', () => {
  it('aborts the S3 upload and deletes the record', async () => {
    const { service, send, repo } = setup({});
    await service.abort('user-1', 'm1');
    expect(send.mock.calls[0][0]).toBeInstanceOf(AbortMultipartUploadCommand);
    expect(repo.deleteMedia).toHaveBeenCalledWith('m1');
  });
});

describe('isShort', () => {
  it('counts square or vertical videos up to 3 minutes as Shorts', () => {
    expect(isShort({ width: 1080, height: 1920, durationSeconds: 59 })).toBe(true);
    expect(isShort({ width: 1080, height: 1080, durationSeconds: 180 })).toBe(true);
    expect(isShort({ width: 1080, height: 1920, durationSeconds: 181 })).toBe(false);
    expect(isShort({ width: 1920, height: 1080, durationSeconds: 30 })).toBe(false);
    expect(isShort({})).toBe(false);
  });
});
