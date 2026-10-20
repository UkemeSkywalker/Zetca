/**
 * POST /api/media/videos/:mediaId/parts
 * Presigned S3 URLs for some parts of an upload.
 * Body: { partNumbers: number[] } → { parts: [{ partNumber, url }] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { VideoUploadService } from '@/lib/services/videoUploadService';
import { readJson, videoUploadErrorResponse } from '@/lib/media/videoUploadResponse';

export async function POST(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = await readJson(request);
      const parts = await new VideoUploadService().partUrls(userId, mediaId, body.partNumbers);
      return NextResponse.json({ parts });
    } catch (error) {
      return videoUploadErrorResponse(error, { endpoint: '/api/media/videos/[mediaId]/parts', method: 'POST', userId });
    }
  });
  return handler(req);
}
