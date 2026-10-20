/**
 * GET /api/youtube/options?region=NG
 * The connected channel's playlists and the categories a video can use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getYouTubeAccess } from '@/lib/services/youtubeAccess';
import { listMyPlaylists, listVideoCategories } from '@/lib/services/youtubeClient';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const region = request.nextUrl.searchParams.get('region') ?? '';
      const regionCode = /^[A-Z]{2}$/.test(region) ? region : 'US';
      const { accessToken } = await getYouTubeAccess(userId);
      const [playlists, categories] = await Promise.all([
        listMyPlaylists(accessToken),
        listVideoCategories(accessToken, regionCode),
      ]);
      return NextResponse.json({ playlists, categories });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/options', userId });
    }
  });
  return handler(req);
}
