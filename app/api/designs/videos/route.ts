/**
 * POST /api/designs/videos: puts a design's words on a video.
 * Body: { videoMediaId, overlayMediaId, format }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { VideoDesignError, VideoDesignService } from '@/lib/services/videoDesignService';
import { designErrorResponse } from '@/lib/design/routeErrors';

const RenderSchema = z.object({
  videoMediaId: z.string().min(1).max(80),
  overlayMediaId: z.string().min(1).max(80),
  format: z.enum(['square', 'portrait', 'story', 'landscape']),
});

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const input = RenderSchema.parse(await request.json().catch(() => ({})));
      return NextResponse.json(await new VideoDesignService().render(userId, input), { status: 201 });
    } catch (error) {
      if (error instanceof VideoDesignError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
      return designErrorResponse(error, { endpoint: 'POST /api/designs/videos', userId });
    }
  });
  return handler(req);
}
