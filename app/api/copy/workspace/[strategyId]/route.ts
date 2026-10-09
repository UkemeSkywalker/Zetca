import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

/** A strategy's copies, its latest generation job and its Copywriter chat */
async function getWorkspaceHandler(_req: NextRequest, userId: string, strategyId: string): Promise<Response> {
  try {
    const workspace = await getCopyService().getWorkspace(strategyId, userId);
    return NextResponse.json(workspace, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to load the copywriter workspace. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ strategyId: string }> }) {
  const { strategyId } = await params;
  const handler = await withAuth(async (request, userId) => getWorkspaceHandler(request, userId, strategyId));
  return handler(req);
}
