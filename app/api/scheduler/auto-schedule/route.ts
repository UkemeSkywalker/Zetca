import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getSchedulerService } from '@/lib/services/container';
import { AutoScheduleInputSchema } from '@/lib/models/scheduler';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

async function autoScheduleHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const body = await req.json();
    const input = AutoScheduleInputSchema.parse(body);
    const cfg = getConfig();

    console.info(`Auto-scheduling copies for strategy: ${input.strategy_id} (mock=${cfg.useMockAgent})`);

    const records = await withTimeout(
      getSchedulerService().autoSchedule(input.strategy_id, userId),
      cfg.agentTimeoutSeconds,
      'Auto-scheduling timed out. Please try again.'
    );

    console.info(`Auto-scheduled ${records.length} posts for strategy: ${input.strategy_id}`);
    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Auto-scheduling failed. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(autoScheduleHandler);
  return handler(req);
}
