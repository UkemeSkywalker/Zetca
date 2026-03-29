import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { withAuth } from '@/lib/middleware/withAuth';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { getConfig } from '@/lib/config';
import { DOWNLOAD_URL_EXPIRY } from '@/types/media';
import { AuthError, logError, formatErrorResponse } from '@/lib/errors';

async function downloadUrlHandler(
  req: NextRequest,
  userId: string,
  mediaId: string
): Promise<Response> {
  try {
    const mediaRepo = new MediaRepository();
    const record = await mediaRepo.getMediaById(mediaId);

    if (!record) {
      return NextResponse.json(
        { error: 'Media file not found', code: 'MEDIA_NOT_FOUND' },
        { status: 404 }
      );
    }

    if (record.userId !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to access this media', code: 'ACCESS_DENIED' },
        { status: 403 }
      );
    }

    const cfg = getConfig();
    const s3ClientConfig: Record<string, any> = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3ClientConfig.credentials = {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
      };
    }
    const s3 = new S3Client(s3ClientConfig);

    const command = new GetObjectCommand({
      Bucket: cfg.s3MediaBucket,
      Key: record.s3Key,
    });

    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: DOWNLOAD_URL_EXPIRY });

    return NextResponse.json({
      downloadUrl,
      mediaId: record.mediaId,
      contentType: record.contentType,
      mediaType: record.mediaType,
    });
  } catch (error) {
    logError(error as Error, { endpoint: `/api/media/${mediaId}/download-url`, method: 'GET', userId });

    if (error instanceof AuthError) {
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: 'An error occurred, please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    return downloadUrlHandler(request, userId, mediaId);
  });
  return handler(req);
}
