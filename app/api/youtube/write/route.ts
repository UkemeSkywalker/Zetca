/**
 * POST /api/youtube/write
 * "Write with Copywriter": drafts a title, description and tags.
 * Body: { brief, filename?, durationSeconds?, isShort?, language? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getVideoWriterAgent } from '@/lib/services/container';
import { VideoWriterRequestSchema } from '@/lib/models/videoWriter';
import { withTimeout } from '@/lib/api/routeHelpers';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const input = VideoWriterRequestSchema.parse(await request.json().catch(() => ({})));
      const cfg = getConfig();
      const copy = await withTimeout(
        getVideoWriterAgent().write(input),
        cfg.agentTimeoutSeconds,
        'The Copywriter took too long. Please try again.'
      );
      return NextResponse.json(copy);
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/write', userId });
    }
  });
  return handler(req);
}
