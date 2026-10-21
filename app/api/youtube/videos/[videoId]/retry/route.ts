/**
 * POST /api/youtube/videos/:videoId/retry
 * Queues a failed video for upload again.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { YouTubeVideoService } from '@/lib/services/youtubeVideoService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';
import { toPublicVideo } from '@/lib/models/youtubeVideo';

export async function POST(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const video = await new YouTubeVideoService().retry(userId, videoId);
      return NextResponse.json({ video: toPublicVideo(video) });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/videos/[videoId]/retry', userId });
    }
  });
  return handler(req);
}
