import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getSchedulerService } from '@/lib/services/container';
import { ManualScheduleInputSchema } from '@/lib/models/scheduler';
import { handleRouteError } from '@/lib/api/routeHelpers';

async function manualScheduleHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const body = await req.json();
    const input = ManualScheduleInputSchema.parse(body);

    console.info(`Manual scheduling copy: ${input.copy_id}`);
    const record = await getSchedulerService().manualSchedule(input, userId);
    console.info(`Manually scheduled post ${record.id} for copy: ${input.copy_id}`);

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Manual scheduling failed. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(manualScheduleHandler);
  return handler(req);
}
