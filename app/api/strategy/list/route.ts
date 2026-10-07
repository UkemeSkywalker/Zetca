import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getStrategyService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function listStrategiesHandler(_req: NextRequest, userId: string): Promise<Response> {
  try {
    console.info(`Retrieving strategy list for user: ${userId}`);
    const strategies = await getStrategyService().getUserStrategies(userId);
    console.info(`Found ${strategies.length} strategies for user: ${userId}`);
    return NextResponse.json(strategies, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve strategies. Please try again.');
  }
}

export async function GET(req: NextRequest) {
  const handler = await withAuth(listStrategiesHandler);
  return handler(req);
}
