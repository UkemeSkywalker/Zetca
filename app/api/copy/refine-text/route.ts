import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getCopywriterAgent } from '@/lib/services/container';
import { RefineTextRequestSchema } from '@/lib/models/copy';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

async function refineTextHandler(req: NextRequest, _userId: string): Promise<Response> {
  try {
    const body = await req.json();
    const request = RefineTextRequestSchema.parse(body);
    const cfg = getConfig();

    console.info(`Refining text for platform: ${request.platform}`);

    const chatResponse = await withTimeout(
      (getCopywriterAgent() as any).chatRefine(request.text, request.platform, request.hashtags, {}, request.message),
      cfg.agentTimeoutSeconds,
      'Text refinement timed out. Please try again.'
    );

    console.info('Successfully refined text');
    return NextResponse.json(chatResponse, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Text refinement failed. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(refineTextHandler);
  return handler(req);
}
