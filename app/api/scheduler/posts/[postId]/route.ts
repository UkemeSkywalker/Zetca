import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getSchedulerService } from '@/lib/services/container';
import { ScheduledPostUpdateSchema } from '@/lib/models/scheduler';
import { jsonError, handleRouteError } from '@/lib/api/routeHelpers';

async function getPostHandler(_req: NextRequest, userId: string, postId: string): Promise<Response> {
  try {
    console.info(`Retrieving scheduled post: ${postId}`);
    const [record, belongsToOther] = await getSchedulerService().getPost(postId, userId);

    if (belongsToOther) {
      console.warn(`User ${userId} attempted to access post ${postId} belonging to another user`);
      return jsonError('Access denied: You do not have permission to access this resource', 403);
    }
    if (record === null) return jsonError('Scheduled post not found', 404);

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve scheduled post. Please try again.');
  }
}

async function updatePostHandler(req: NextRequest, userId: string, postId: string): Promise<Response> {
  try {
    const body = await req.json();
    const updates = ScheduledPostUpdateSchema.parse(body);

    console.info(`Updating scheduled post: ${postId}`);
    const record = await getSchedulerService().updatePost(postId, updates, userId);
    console.info(`Successfully updated post: ${postId}`);

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to update scheduled post. Please try again.');
  }
}

async function deletePostHandler(_req: NextRequest, userId: string, postId: string): Promise<Response> {
  try {
    console.info(`Deleting scheduled post: ${postId}`);
    const [deleted, belongsToOther] = await getSchedulerService().deletePost(postId, userId);

    if (belongsToOther) {
      console.warn(`User ${userId} attempted to delete post ${postId} belonging to another user`);
      return jsonError('Access denied: You do not have permission to delete this resource', 403);
    }
    if (!deleted) return jsonError('Scheduled post not found', 404);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleRouteError(error, 'Failed to delete scheduled post. Please try again.');
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const handler = await withAuth(async (request, userId) => getPostHandler(request, userId, postId));
  return handler(req);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const handler = await withAuth(async (request, userId) => updatePostHandler(request, userId, postId));
  return handler(req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const handler = await withAuth(async (request, userId) => deletePostHandler(request, userId, postId));
  return handler(req);
}
