/**
 * POST /api/media/videos/:mediaId/complete
 * Joins the uploaded parts into the final video.
 * Body: { parts: [{ partNumber, etag }], durationSeconds?, width?, height? } → { media }
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
      const media = await new VideoUploadService().complete(userId, mediaId, {
        parts: body.parts,
        durationSeconds: body.durationSeconds,
        width: body.width,
        height: body.height,
      });
      return NextResponse.json({ media });
    } catch (error) {
      return videoUploadErrorResponse(error, { endpoint: '/api/media/videos/[mediaId]/complete', method: 'POST', userId });
    }
  });
  return handler(req);
}
