import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { withAuth } from '@/lib/middleware/withAuth';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { getConfig } from '@/lib/config';
import { AuthError, logError, formatErrorResponse } from '@/lib/errors';

/**
 * Clear media_id from any scheduled posts referencing this media.
 */
async function clearPostMediaReferences(
  mediaId: string,
  cfg: ReturnType<typeof getConfig>
): Promise<void> {
  const clientConfig: Record<string, any> = { region: cfg.awsRegion };
  if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: cfg.awsAccessKeyId,
      secretAccessKey: cfg.awsSecretAccessKey,
    };
  }
  const docClient = DynamoDBDocumentClient.from(new DynamoDBClient(clientConfig));

  // Scan for posts with this media_id (media attachments are sparse, scan is acceptable)
  const scanResult = await docClient.send(
    new ScanCommand({
      TableName: cfg.dynamoDbScheduledPostsTableName,
      FilterExpression: 'media_id = :mediaId',
      ExpressionAttributeValues: { ':mediaId': mediaId },
      ProjectionExpression: 'postId',
    })
  );

  if (scanResult.Items && scanResult.Items.length > 0) {
    await Promise.all(
      scanResult.Items.map((item) =>
        docClient.send(
          new UpdateCommand({
            TableName: cfg.dynamoDbScheduledPostsTableName,
            Key: { postId: item.postId },
            UpdateExpression: 'REMOVE media_id',
          })
        )
      )
    );
  }
}

async function deleteMediaHandler(
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

    // Clear media_id from any scheduled posts referencing this media
    await clearPostMediaReferences(mediaId, cfg);

    // Delete S3 object
    const s3ClientConfig: Record<string, any> = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3ClientConfig.credentials = {
        accessKeyId: cfg.awsAccessKeyId,
        secretAccessKey: cfg.awsSecretAccessKey,
      };
    }
    const s3 = new S3Client(s3ClientConfig);
    await s3.send(
      new DeleteObjectCommand({
        Bucket: cfg.s3MediaBucket,
        Key: record.s3Key,
      })
    );

    // Delete media record from DynamoDB
    await mediaRepo.deleteMedia(mediaId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error as Error, { endpoint: `/api/media/${mediaId}`, method: 'DELETE', userId });

    if (error instanceof AuthError) {
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: 'An error occurred, please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    return deleteMediaHandler(request, userId, mediaId);
  });
  return handler(req);
}
