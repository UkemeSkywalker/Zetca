import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getPublisherRepository } from '@/lib/services/container';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function listLogsHandler(_req: NextRequest, userId: string): Promise<Response> {
  try {
    const records = await getPublisherRepository().listLogsByUser(userId);
    console.info(`Retrieved ${records.length} publish logs for user: ${userId}`);
    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Failed to retrieve publish logs. Please try again.');
  }
}

export async function GET(req: NextRequest) {
  const handler = await withAuth(listLogsHandler);
  return handler(req);
}
