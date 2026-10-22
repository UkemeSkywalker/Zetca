/**
 * GET /api/youtube/videos/:videoId (and PUT to edit, DELETE to remove from Zetca)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { YouTubeVideoService } from '@/lib/services/youtubeVideoService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';
import { toPublicVideo } from '@/lib/models/youtubeVideo';

export async function GET(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const video = await new YouTubeVideoService().get(userId, videoId);
      return NextResponse.json({ video: toPublicVideo(video) });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/videos/[videoId]', userId });
    }
  });
  return handler(req);
}

/** PUT /api/youtube/videos/:videoId: saves edited details (and sends them to YouTube once it's there) */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { video, warnings } = await new YouTubeVideoService().update(userId, videoId, await request.json().catch(() => ({})));
      return NextResponse.json({ video: toPublicVideo(video), warnings });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: 'PUT /api/youtube/videos/[videoId]', userId });
    }
  });
  return handler(req);
}

/** DELETE /api/youtube/videos/:videoId: removes it from Zetca (cancels it if it hasn't gone up; YouTube is untouched) */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      return NextResponse.json(await new YouTubeVideoService().remove(userId, videoId));
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: 'DELETE /api/youtube/videos/[videoId]', userId });
    }
  });
  return handler(req);
}
