import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getStrategyService } from '@/lib/services/container';
import { StrategyInputSchema } from '@/lib/models/strategy';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

async function generateStrategyHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const body = await req.json();
    const strategyInput = StrategyInputSchema.parse(body);
    const cfg = getConfig();

    console.info(`Generating strategy for brand: ${strategyInput.brand_name} (mock=${cfg.useMockAgent})`);

    const record = await withTimeout(
      getStrategyService().generateAndStoreStrategy(strategyInput, userId),
      cfg.agentTimeoutSeconds,
      `Strategy generation timed out after ${cfg.agentTimeoutSeconds} seconds. Please try again.`
    );

    console.info(`Successfully generated and stored strategy for: ${strategyInput.brand_name} (ID: ${record.id})`);
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Strategy generation failed. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(generateStrategyHandler);
  return handler(req);
}
