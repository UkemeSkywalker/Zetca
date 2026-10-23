/**
 * POST /api/youtube/research
 * Keyword and tag suggestions scored from real YouTube search results.
 * Body: { title, mediaId?, region, language } → { keywords, tags, basedOn }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { ResearchRequestSchema } from '@/lib/models/videoInsights';
import { ResearchError, YouTubeResearchService } from '@/lib/services/youtubeResearchService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';
import { priceOf, withCredits } from '@/lib/billing/charge';

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = ResearchRequestSchema.parse(await request.json().catch(() => ({})));
      return NextResponse.json(await withCredits(userId, 'video_topics', priceOf('video_topics'), () => new YouTubeResearchService().research(userId, body)));
    } catch (error) {
      if (error instanceof ResearchError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/research', userId });
    }
  });
  return handler(req);
}
