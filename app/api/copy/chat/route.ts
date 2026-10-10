import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getCopyService } from '@/lib/services/container';
import { CopyChatRequestSchema } from '@/lib/models/copy';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

/**
 * Chat with the copywriter about a strategy. It may reply, write one new
 * copy, rewrite the open copy (copy_id), or start a full set in the background.
 */
async function chatHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const input = CopyChatRequestSchema.parse(await req.json());
    const cfg = getConfig();
    const result = await withTimeout(
      getCopyService().chat(input.strategy_id, userId, input.message, input.copy_id),
      cfg.agentTimeoutSeconds,
      'The copywriter took too long to answer. Please try again.'
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'The copywriter could not answer. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(chatHandler);
  return handler(req);
}
