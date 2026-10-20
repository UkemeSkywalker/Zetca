/**
 * DELETE /api/media/videos/:mediaId
 * Cancels an unfinished upload. Finished videos are deleted with DELETE /api/media/:mediaId.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { VideoUploadService } from '@/lib/services/videoUploadService';
import { videoUploadErrorResponse } from '@/lib/media/videoUploadResponse';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      await new VideoUploadService().abort(userId, mediaId);
      return NextResponse.json({ success: true });
    } catch (error) {
      return videoUploadErrorResponse(error, { endpoint: '/api/media/videos/[mediaId]', method: 'DELETE', userId });
    }
  });
  return handler(req);
}
