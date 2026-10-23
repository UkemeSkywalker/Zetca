/**
 * GET /api/designs/ai: the AI image and video models, their prices, and the user's credits
 * POST /api/designs/ai: starts an AI image or video. Body: { kind, prompt, format, model? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { Credits } from '@/lib/billing/credits';
import { DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL, imageOptions, videoOptions } from '@/lib/billing/aiModels';
import { planOf } from '@/lib/billing/plans';
import { AiDesignService, toPublicJob } from '@/lib/services/aiDesignService';
import { designErrorResponse } from '@/lib/design/routeErrors';

const StartSchema = z.object({
  kind: z.enum(['image', 'video']),
  prompt: z.string().trim().min(3, 'Describe what the AI should make').max(1200),
  format: z.enum(['square', 'portrait', 'story', 'landscape']),
  model: z.string().max(40).optional(),
});

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const credits = await new Credits().get(userId);
      return NextResponse.json({
        credits,
        tier: planOf(credits.plan).tier,
        available: !!getConfig().higgsfieldApiKey,
        models: { image: imageOptions(), video: videoOptions(), defaults: { image: DEFAULT_IMAGE_MODEL, video: DEFAULT_VIDEO_MODEL } },
      });
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
      return NextResponse.json({ job: toPublicJob(job), credits: await new Credits().get(userId) }, { status: 202 });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'POST /api/designs/ai', userId });
    }
  });
  return handler(req);
}
