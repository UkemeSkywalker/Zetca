/**
 * POST /api/youtube/suggestions
 * Titles and a description written around researched keywords, each scored.
 * Body: { title, mediaId?, language, isShort, keywords, chaptersOk } → { titles, description }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { ResearchRequestSchema } from '@/lib/models/videoInsights';
import { ResearchError, YouTubeResearchService } from '@/lib/services/youtubeResearchService';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

const Body = ResearchRequestSchema.extend({
  keywords: z
    .array(
      z.object({
        phrase: z.string().min(1).max(100),
        score: z.number().min(0).max(100),
        medianViews: z.number().min(0),
        recentCount: z.number().int().min(0),
        strongCompetitors: z.number().int().min(0),
        sampleSize: z.number().int().min(0),
      })
    )
    .max(10),
  chaptersOk: z.boolean().nullable().default(null),
});

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = Body.parse(await request.json().catch(() => ({})));
      return NextResponse.json(await new YouTubeResearchService().write(userId, body));
    } catch (error) {
      if (error instanceof ResearchError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/suggestions', userId });
    }
  });
  return handler(req);
}
