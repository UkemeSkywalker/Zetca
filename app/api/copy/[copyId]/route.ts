import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { jsonError, handleRouteError } from '@/lib/api/routeHelpers';

async function getCopyHandler(_req: NextRequest, userId: string, copyId: string): Promise<Response> {
  try {
    console.info(`Retrieving copy ${copyId}`);
    const [record, belongsToOther] = await getCopyService().getCopy(copyId, userId);

    if (belongsToOther) {
      console.warn(`User ${userId} attempted to access copy ${copyId} belonging to another user`);
      return jsonError('Access denied: You do not have permission to access this resource', 403);
    }
    if (record === null) return jsonError('Copy not found', 404);

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve copy. Please try again.');
  }
}

async function deleteCopyHandler(_req: NextRequest, userId: string, copyId: string): Promise<Response> {
  try {
    console.info(`Deleting copy ${copyId}`);
    const [deleted, belongsToOther] = await getCopyService().deleteCopy(copyId, userId);

    if (belongsToOther) {
      console.warn(`User ${userId} attempted to delete copy ${copyId} belonging to another user`);
      return jsonError('Access denied: You do not have permission to delete this resource', 403);
    }
    if (!deleted) return jsonError('Copy not found', 404);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete copy. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ copyId: string }> }) {
  const { copyId } = await params;
  const handler = await withAuth(async (request, userId) => getCopyHandler(request, userId, copyId));
  return handler(req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ copyId: string }> }) {
  const { copyId } = await params;
  const handler = await withAuth(async (request, userId) => deleteCopyHandler(request, userId, copyId));
  return handler(req);
}
