/**
 * POST /api/designs/ai/:jobId/hd: makes an HD version of a finished draft video.
 * Body: { quality: 'hd' | 'full_hd' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { Credits } from '@/lib/billing/credits';
import { AiDesignService, toPublicJob } from '@/lib/services/aiDesignService';
import { designErrorResponse } from '@/lib/design/routeErrors';

const HdSchema = z.object({ quality: z.enum(['hd', 'full_hd']) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { quality } = HdSchema.parse(await request.json().catch(() => ({})));
      const job = await new AiDesignService().makeHd(userId, jobId, quality);
      return NextResponse.json({ job: toPublicJob(job), credits: await new Credits().get(userId) }, { status: 202 });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'POST /api/designs/ai/[jobId]/hd', userId });
    }
  });
  return handler(req);
}
