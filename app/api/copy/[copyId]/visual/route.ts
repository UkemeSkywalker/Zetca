/**
 * PUT /api/copy/:copyId/visual: sets the image or video that goes with a copy.
 * Body: { kind, design_id?, media_id?, media_type? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ copyId: string }> }) {
  const { copyId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const record = await getCopyService().setVisual(copyId, userId, await request.json().catch(() => ({})));
      return NextResponse.json(record, { status: 200 });
    } catch (error) {
      return handleRouteError(error, 'Couldn’t save the visual. Please try again.');
    }
  });
  return handler(req);
}
