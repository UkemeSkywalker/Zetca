import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getStrategyService } from '@/lib/services/container';
import { DescriptionNotAvailableError } from '@/lib/services/strategyService';
import { PLATFORM_IDS } from '@/lib/models/strategy';
import { jsonError, withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

const RegenerateSchema = z.object({ platform: z.enum(PLATFORM_IDS) });

/** Regenerate one platform's channel description for a quiz strategy */
async function regenerateHandler(req: NextRequest, userId: string, strategyId: string): Promise<Response> {
  try {
    const { platform } = RegenerateSchema.parse(await req.json());
    const cfg = getConfig();

    const description = await withTimeout(
      getStrategyService().regenerateChannelDescription(strategyId, userId, platform),
      cfg.agentTimeoutSeconds,
      `Regenerating the description timed out after ${cfg.agentTimeoutSeconds} seconds. Please try again.`
    );
    if (description === null) return jsonError('Strategy not found', 404);

    return NextResponse.json(description, { status: 200 });
  } catch (error) {
    if (error instanceof DescriptionNotAvailableError) return jsonError(error.message, 400);
    return handleRouteError(error, 'Regenerating the description failed. Please try again.');
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const handler = await withAuth(async (request, userId) => regenerateHandler(request, userId, id));
  return handler(req);
}
