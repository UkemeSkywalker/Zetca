/**
 * GET /api/designs: the user's designs, most recently edited first
 * POST /api/designs: saves a new design. Body: { name, source, doc }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { DesignService } from '@/lib/services/designService';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      return NextResponse.json({ designs: await new DesignService().list(userId) });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'GET /api/designs', userId });
    }
  });
  return handler(req);
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const design = await new DesignService().create(userId, await request.json().catch(() => ({})));
      return NextResponse.json({ design }, { status: 201 });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'POST /api/designs', userId });
    }
  });
  return handler(req);
}
