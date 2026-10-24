/**
 * GET /api/designs/ai: the user's AI credits this month
 * POST /api/designs/ai: starts an AI image or video. Body: { kind, prompt, format }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { AiCredits } from '@/lib/services/aiCredits';
import { AiDesignService, toPublicJob } from '@/lib/services/aiDesignService';
import { designErrorResponse } from '@/lib/design/routeErrors';

const StartSchema = z.object({
  kind: z.enum(['image', 'video']),
  prompt: z.string().trim().min(3, 'Describe what the AI should make').max(1200),
  format: z.enum(['square', 'portrait', 'story', 'landscape']),
});

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      return NextResponse.json({ credits: await new AiCredits().get(userId), available: !!getConfig().higgsfieldApiKey });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'GET /api/designs/ai', userId });
    }
  });
  return handler(req);
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const input = StartSchema.parse(await request.json().catch(() => ({})));
      const job = await new AiDesignService().start(userId, input);
      return NextResponse.json({ job: toPublicJob(job), credits: await new AiCredits().get(userId) }, { status: 202 });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'POST /api/designs/ai', userId });
    }
  });
  return handler(req);
}
