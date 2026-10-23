/**
 * POST /api/designs/write: writes the words for a design from a description.
 * Body: { prompt, styleId? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getDesignWriterAgent } from '@/lib/services/container';
import { DesignWriterRequestSchema } from '@/lib/models/designWriter';
import { withTimeout } from '@/lib/api/routeHelpers';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const input = DesignWriterRequestSchema.parse(await request.json().catch(() => ({})));
      const text = await withTimeout(getDesignWriterAgent().write(input), getConfig().agentTimeoutSeconds, 'That took too long. Please try again.');
      return NextResponse.json(text);
    } catch (error) {
      return designErrorResponse(error, { endpoint: '/api/designs/write', userId });
    }
  });
  return handler(req);
}
