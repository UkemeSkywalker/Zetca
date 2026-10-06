import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getPublisherService, getSchedulerRepository, getUserRepository } from '@/lib/services/container';
import { jsonError, handleRouteError } from '@/lib/api/routeHelpers';

async function publishPostHandler(_req: NextRequest, userId: string, postId: string): Promise<Response> {
  try {
    // Retrieve the post without a user filter to distinguish 404 vs 403.
    const post = await getSchedulerRepository().getPostById(postId);
    if (post === null) return jsonError('Post not found', 404);

    if (post.user_id !== userId) {
      return jsonError('Access denied: You do not have permission to publish this post', 403);
    }
    if (post.platform !== 'linkedin') {
      return jsonError('Only LinkedIn publishing is currently supported', 400);
    }
    if (post.status === 'published') {
      return jsonError('Post is already published', 400);
    }

    const credentials = await getUserRepository().getUserLinkedInCredentials(userId);
    if (credentials === null || !credentials.linkedinAccessToken) {
      return jsonError('LinkedIn account not connected. Please connect your LinkedIn account first.', 400);
    }
    if (!credentials.linkedinSub) {
      return jsonError('LinkedIn profile information is incomplete. Please reconnect your LinkedIn account.', 400);
    }

    const logRecord = await getPublisherService().publishPost(post, credentials);

    if (logRecord.status === 'failed') {
      console.warn(`Manual publish failed for post ${postId}: ${logRecord.error_code}`);
    } else {
      console.info(`Manual publish succeeded for post ${postId}`);
    }

    return NextResponse.json(logRecord, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Publishing failed. Please try again.');
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const handler = await withAuth(async (request, userId) => publishPostHandler(request, userId, postId));
  return handler(req);
}
