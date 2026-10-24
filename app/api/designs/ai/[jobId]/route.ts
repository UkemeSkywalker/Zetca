/**
 * GET /api/designs/ai/:jobId: checks an AI image or video and moves it on
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { AiDesignService, toPublicJob } from '@/lib/services/aiDesignService';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      return NextResponse.json({ job: toPublicJob(await new AiDesignService().advance(userId, jobId)) });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'GET /api/designs/ai/[jobId]', userId });
    }
  });
  return handler(req);
}
