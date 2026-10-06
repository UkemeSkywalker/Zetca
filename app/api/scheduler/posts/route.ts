import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getSchedulerService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function listPostsHandler(_req: NextRequest, userId: string): Promise<Response> {
  try {
    console.info(`Listing scheduled posts for user: ${userId}`);
    const posts = await getSchedulerService().listPostsByUser(userId);
    console.info(`Found ${posts.length} scheduled posts for user: ${userId}`);
    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve scheduled posts. Please try again.');
  }
}

export async function GET(req: NextRequest) {
  const handler = await withAuth(listPostsHandler);
  return handler(req);
}
