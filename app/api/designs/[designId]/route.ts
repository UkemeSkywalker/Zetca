/**
 * GET /api/designs/:designId (PUT to save changes, DELETE to delete it)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { DesignService } from '@/lib/services/designService';
import { designErrorResponse } from '@/lib/design/routeErrors';

type Params = { params: Promise<{ designId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { designId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      return NextResponse.json({ design: await new DesignService().get(userId, designId) });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'GET /api/designs/[designId]', userId });
    }
  });
  return handler(req);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { designId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const design = await new DesignService().update(userId, designId, await request.json().catch(() => ({})));
      return NextResponse.json({ design });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'PUT /api/designs/[designId]', userId });
    }
  });
  return handler(req);
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { designId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      await new DesignService().remove(userId, designId);
      return NextResponse.json({ deleted: true });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'DELETE /api/designs/[designId]', userId });
    }
  });
  return handler(req);
}
