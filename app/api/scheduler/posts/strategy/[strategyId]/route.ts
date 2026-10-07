import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getSchedulerService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function listPostsByStrategyHandler(_req: NextRequest, userId: string, strategyId: string): Promise<Response> {
  try {
    console.info(`Listing scheduled posts for strategy: ${strategyId}`);
    const posts = await getSchedulerService().listPostsByStrategy(strategyId, userId);
    console.info(`Found ${posts.length} scheduled posts for strategy: ${strategyId}`);
    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve scheduled posts. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ strategyId: string }> }) {
  const { strategyId } = await params;
  const handler = await withAuth(async (request, userId) => listPostsByStrategyHandler(request, userId, strategyId));
  return handler(req);
}
