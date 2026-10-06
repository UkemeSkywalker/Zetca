import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getSchedulerService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function deleteAllPostsHandler(_req: NextRequest, userId: string): Promise<Response> {
  try {
    console.info(`Deleting all scheduled posts for user: ${userId}`);
    const count = await getSchedulerService().deleteAllPosts(userId);
    console.info(`Deleted ${count} scheduled posts for user: ${userId}`);
    return NextResponse.json({ deleted: count }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete scheduled posts. Please try again.');
  }
}

export async function DELETE(req: NextRequest) {
  const handler = await withAuth(deleteAllPostsHandler);
  return handler(req);
}
