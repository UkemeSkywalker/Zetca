/**
 * GET /api/youtube/videos: the user's YouTube videos, newest first.
 * POST /api/youtube/videos: schedules an uploaded video for YouTube with its
 * details ({ mediaId, details }) and starts uploading it straight away.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { getConfig } from '@/lib/config';
import { YouTubeUploadEngine } from '@/lib/services/youtubeUploadEngine';
import { withAuth } from '@/lib/middleware/withAuth';
import { YouTubeVideoService } from '@/lib/services/youtubeVideoService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';
import { toPublicVideo } from '@/lib/models/youtubeVideo';

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const videos = await new YouTubeVideoService().list(userId);
      return NextResponse.json({ videos: videos.map(toPublicVideo) });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/videos', userId });
    }
  });
  return handler(req);
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = await request.json().catch(() => ({}));
      const video = await new YouTubeVideoService().create(userId, body);
      // Start uploading once the response is sent, rather than waiting for the next background cycle
      if (getConfig().youtubeWorkerEnabled) {
        after(() =>
          new YouTubeUploadEngine().processNow(video.videoId).catch((e) =>
            console.error(`YouTube upload for ${video.videoId} failed to start: ${(e as Error)?.message ?? e}`)
          )
        );
      }
      return NextResponse.json({ video: toPublicVideo(video) }, { status: 201 });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/videos', userId });
    }
  });
  return handler(req);
}
