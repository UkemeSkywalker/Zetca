import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getPublisherRepository } from '@/lib/services/container';
import { jsonError, handleRouteError } from '@/lib/api/routeHelpers';

async function listLogsByPostHandler(_req: NextRequest, userId: string, postId: string): Promise<Response> {
  try {
    const postOwner = await getPublisherRepository().getPostOwner(postId);
    if (postOwner !== null && postOwner !== userId) {
      return jsonError('Access denied: You do not have permission to access this resource', 403);
    }

    const records = await getPublisherRepository().listLogsByPost(postId);
    console.info(`Retrieved ${records.length} publish logs for post: ${postId}`);
    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve publish logs. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const handler = await withAuth(async (request, userId) => listLogsByPostHandler(request, userId, postId));
  return handler(req);
}
