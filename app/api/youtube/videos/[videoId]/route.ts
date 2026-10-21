/**
 * GET /api/youtube/videos/:videoId
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { YouTubeVideoService } from '@/lib/services/youtubeVideoService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const video = await new YouTubeVideoService().get(userId, videoId);
      return NextResponse.json({ video });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/videos/[videoId]', userId });
    }
  });
  return handler(req);
}
