import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getStrategyService } from '@/lib/services/container';
import { jsonError, handleRouteError } from '@/lib/api/routeHelpers';

async function getStrategyHandler(_req: NextRequest, userId: string, strategyId: string): Promise<Response> {
  try {
    console.info(`Retrieving strategy ${strategyId} for user: ${userId}`);
    const [strategy, belongsToOtherUser] = await getStrategyService().getStrategy(strategyId, userId);

    if (belongsToOtherUser) {
      console.warn(`User ${userId} attempted to access strategy ${strategyId} belonging to another user`);
      return jsonError('Access denied: You do not have permission to access this strategy', 403);
    }
    if (strategy === null) {
      console.warn(`Strategy ${strategyId} not found`);
      return jsonError('Strategy not found', 404);
    }

    console.info(`Successfully retrieved strategy ${strategyId}`);
    return NextResponse.json(strategy, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve strategy. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const handler = await withAuth(async (request, userId) => getStrategyHandler(request, userId, id));
  return handler(req);
}
