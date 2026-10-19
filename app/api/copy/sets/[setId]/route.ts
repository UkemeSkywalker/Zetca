import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { handleRouteError, jsonError } from '@/lib/api/routeHelpers';

/**
 * Delete a whole set of copies: a full set (its job id), or "other" for the
 * strategy's copies that aren't part of a full set. Requires ?strategy_id=.
 */
async function deleteSetHandler(req: NextRequest, userId: string, setId: string): Promise<Response> {
  const strategyId = req.nextUrl.searchParams.get('strategy_id');
  if (!strategyId) return jsonError('strategy_id is required', 400);
  try {
    const deleted = await getCopyService().deleteSet(strategyId, userId, setId);
    console.info(`Deleted copy set ${setId} (${deleted} copies) from strategy ${strategyId}`);
    return NextResponse.json({ deleted }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete the copies. Please try again.');
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const handler = await withAuth(async (request, userId) => deleteSetHandler(request, userId, setId));
  return handler(req);
}
