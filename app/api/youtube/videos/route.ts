/**
 * POST /api/youtube/videos
 * Schedules an uploaded video for YouTube with its details. Body: { mediaId, details }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { YouTubeVideoService } from '@/lib/services/youtubeVideoService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';
import { toPublicVideo } from '@/lib/models/youtubeVideo';

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = await request.json().catch(() => ({}));
      const video = await new YouTubeVideoService().create(userId, body);
      return NextResponse.json({ video: toPublicVideo(video) }, { status: 201 });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/videos', userId });
    }
  });
  return handler(req);
}
