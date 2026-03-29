import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { withAuth } from '@/lib/middleware/withAuth';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { getConfig } from '@/lib/config';
import {
  isAllowedContentType,
  getMediaType,
  validateFileSize,
  generateS3Key,
} from '@/lib/media/validation';
import {
  UPLOAD_URL_EXPIRY_IMAGE,
  UPLOAD_URL_EXPIRY_VIDEO,
} from '@/types/media';
import { AuthError, logError, formatErrorResponse } from '@/lib/errors';

async function uploadUrlHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const body = await req.json();
    const { contentType, filename, fileSize } = body;

    // Validate content type
    if (!contentType || typeof contentType !== 'string' || !isAllowedContentType(contentType)) {
      return NextResponse.json(
        { error: `Content type ${contentType || ''} is not allowed. Allowed types: image/jpeg, image/png, image/gif, image/webp, video/mp4, video/quicktime, video/webm`, code: 'INVALID_CONTENT_TYPE' },
        { status: 400 }
      );
    }

    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'filename is required', code: 'MISSING_FIELD' },
        { status: 400 }
      );
    }

    // Validate file size is a positive integer
    if (typeof fileSize !== 'number' || !Number.isInteger(fileSize) || fileSize <= 0) {
      return NextResponse.json(
        { error: 'File size must be a positive integer', code: 'INVALID_FILE_SIZE' },
        { status: 400 }
      );
    }

    const mediaType = getMediaType(contentType);

    // Validate file size against media-type-specific limit
    if (!validateFileSize(fileSize, mediaType)) {
      const limitMB = mediaType === 'video' ? 100 : 10;
      return NextResponse.json(
        { error: `${mediaType === 'video' ? 'Video' : 'Image'} files must be ${limitMB} MB or smaller`, code: 'FILE_TOO_LARGE' },
        { status: 400 }
      );
    }

    const cfg = getConfig();
    const mediaId = randomUUID();
    const s3Key = generateS3Key(userId, mediaId, filename);

    // Create media record in DynamoDB
    const mediaRepo = new MediaRepository();
    await mediaRepo.createMedia({
      mediaId,
      userId,
      s3Key,
      contentType,
      fileSize,
      mediaType,
      originalFilename: filename,
      createdAt: new Date().toISOString(),
    });

    // Generate presigned PUT URL
    const s3ClientConfig: Record<string, any> = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3ClientConfig.credentials = {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
      };
    }
    const s3 = new S3Client(s3ClientConfig);

    const expiresIn = mediaType === 'video' ? UPLOAD_URL_EXPIRY_VIDEO : UPLOAD_URL_EXPIRY_IMAGE;

    const command = new PutObjectCommand({
      Bucket: cfg.s3MediaBucket,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn });

    return NextResponse.json({ uploadUrl, mediaId, s3Key }, { status: 200 });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/media/upload-url', method: 'POST', userId });

    if (error instanceof AuthError) {
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: 'Failed to generate upload URL', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(uploadUrlHandler);
  return handler(req);
}
