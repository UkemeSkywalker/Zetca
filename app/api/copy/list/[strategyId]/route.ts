import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function listCopiesHandler(_req: NextRequest, userId: string, strategyId: string): Promise<Response> {
  try {
    console.info(`Listing copies for strategy: ${strategyId}`);
    const copies = await getCopyService().getCopiesByStrategy(strategyId, userId);
    console.info(`Found ${copies.length} copies for strategy: ${strategyId}`);
    return NextResponse.json(copies, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve copies. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ strategyId: string }> }) {
  const { strategyId } = await params;
  const handler = await withAuth(async (request, userId) => listCopiesHandler(request, userId, strategyId));
  return handler(req);
}
