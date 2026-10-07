import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getCopyService } from '@/lib/services/container';
import { ChatRequestSchema } from '@/lib/models/copy';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

async function chatRefineHandler(req: NextRequest, userId: string, copyId: string): Promise<Response> {
  try {
    const body = await req.json();
    const chatRequest = ChatRequestSchema.parse(body);
    const cfg = getConfig();

    console.info(`Chat refinement for copy ${copyId}`);

    const [chatResponse] = await withTimeout(
      getCopyService().chatRefineCopy(copyId, chatRequest.message, userId),
      cfg.agentTimeoutSeconds,
      'Chat refinement timed out. Please try again.'
    );

    console.info(`Successfully refined copy ${copyId}`);
    return NextResponse.json(chatResponse, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Chat refinement failed. Please try again.');
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ copyId: string }> }) {
  const { copyId } = await params;
  const handler = await withAuth(async (request, userId) => chatRefineHandler(request, userId, copyId));
  return handler(req);
}
