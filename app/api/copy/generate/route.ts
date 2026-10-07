import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getCopyService } from '@/lib/services/container';
import { CopyGenerateInputSchema } from '@/lib/models/copy';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

async function generateCopiesHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const body = await req.json();
    const input = CopyGenerateInputSchema.parse(body);
    const cfg = getConfig();

    console.info(`Generating copies for strategy: ${input.strategy_id} (mock=${cfg.useMockAgent})`);

    const records = await withTimeout(
      getCopyService().generateCopies(input.strategy_id, userId),
      cfg.agentTimeoutSeconds,
      'Copy generation timed out. Please try again.'
    );

    console.info(`Generated ${records.length} copies for strategy: ${input.strategy_id}`);
    return NextResponse.json(records, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Copy generation failed. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(generateCopiesHandler);
  return handler(req);
}
