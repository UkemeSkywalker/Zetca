/**
 * Finished videos for designs: an AI clip with the design's words on top.
 */

import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config';
import { MediaRepository } from '../db/mediaRepository';
import { generateS3Key } from '../media/validation';
import { overlayVideo } from '../media/videoOverlay';
import { EXPORT_WIDTH, FORMATS, type FormatId } from '../design/types';

export class VideoDesignError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'VideoDesignError';
  }
}

export class VideoDesignService {
  private s3: S3Client;
  private bucket: string;

  constructor(private media = new MediaRepository(), s3?: S3Client, private overlay = overlayVideo) {
    const cfg = getConfig();
    const s3Config: S3ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.s3 = s3 ?? new S3Client(s3Config);
    this.bucket = cfg.s3MediaBucket;
  }

  private async own(userId: string, mediaId: string, type: 'image' | 'video') {
    const m = await this.media.getMediaById(mediaId);
    if (!m || m.userId !== userId) throw new VideoDesignError('That file isn’t yours', 403);
    if (m.mediaType !== type) throw new VideoDesignError(`Expected ${type === 'video' ? 'a video' : 'an image'}`);
    return m;
  }

  /** The video with the overlay image on top, saved as a new video in the user's media */
  async render(userId: string, input: { videoMediaId: string; overlayMediaId: string; format: FormatId }): Promise<{ mediaId: string }> {
    const video = await this.own(userId, input.videoMediaId, 'video');
    const overlay = await this.own(userId, input.overlayMediaId, 'image');
    const url = (key: string) => getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 600 });
    const f = FORMATS[input.format];
    const width = EXPORT_WIDTH[input.format] ?? f.width;
    const height = (f.height / f.width) * width;
    const bytes = await this.overlay(await url(video.s3Key), await url(overlay.s3Key), width, height);
    const mediaId = randomUUID();
    const filename = 'design-video.mp4';
    const s3Key = generateS3Key(userId, mediaId, filename);
    await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: s3Key, Body: bytes, ContentType: 'video/mp4' }));
    await this.media.createMedia({
      mediaId,
      userId,
      s3Key,
      contentType: 'video/mp4',
      fileSize: bytes.length,
      mediaType: 'video',
      originalFilename: filename,
      createdAt: new Date().toISOString(),
      ...(video.durationSeconds ? { durationSeconds: video.durationSeconds } : {}),
    });
    return { mediaId };
  }
}
