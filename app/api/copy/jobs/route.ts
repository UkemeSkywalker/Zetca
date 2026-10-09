import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { CopyJobStartSchema } from '@/lib/models/copy';
import { handleRouteError } from '@/lib/api/routeHelpers';

/**
 * Start writing a full set of copies in the background. Returns the job
 * straight away (202); the copies are saved one by one as they're written,
 * and GET /api/copy/workspace/[strategyId] reports progress.
 */
async function startJobHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const input = CopyJobStartSchema.parse(await req.json());
    const job = await getCopyService().startGeneration(input.strategy_id, userId);
    console.info(`Copy job ${job.id} for strategy ${input.strategy_id}: ${job.status}`);
    return NextResponse.json(job, { status: 202 });
  } catch (error) {
    return handleRouteError(error, 'Could not start generating copies. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(startJobHandler);
  return handler(req);
}
