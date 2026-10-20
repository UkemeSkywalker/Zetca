/**
 * POST /api/media/videos
 * Starts a large video upload (up to 10 GB) that the browser sends to S3 in parts.
 * Body: { filename, contentType, fileSize } → { mediaId, partSize, partCount }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { VideoUploadService } from '@/lib/services/videoUploadService';
import { readJson, videoUploadErrorResponse } from '@/lib/media/videoUploadResponse';

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = await readJson(request);
      const started = await new VideoUploadService().start(userId, {
        filename: body.filename,
        contentType: body.contentType,
        fileSize: body.fileSize,
      });
      return NextResponse.json(started, { status: 201 });
    } catch (error) {
      return videoUploadErrorResponse(error, { endpoint: '/api/media/videos', method: 'POST', userId });
    }
  });
  return handler(req);
}
