import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getPublisherService } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function publishPostHandler(_req: NextRequest, userId: string, postId: string): Promise<Response> {
  try {
    // Claims the post first, so the scanner (or another server) can't publish it too
    const logRecord = await getPublisherService().publishNow(postId, userId);
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
