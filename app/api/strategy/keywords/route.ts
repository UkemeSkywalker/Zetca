import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getKeywordAgent } from '@/lib/services/container';
import { KeywordRequestSchema } from '@/lib/models/keywords';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

async function suggestKeywordsHandler(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json();
    const input = KeywordRequestSchema.parse(body);
    const cfg = getConfig();

    const keywords = await withTimeout(
      getKeywordAgent().suggestKeywords(input),
      cfg.agentTimeoutSeconds,
      `Keyword suggestions timed out after ${cfg.agentTimeoutSeconds} seconds. Please try again.`
    );

    return NextResponse.json({ keywords }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, 'Keyword suggestions failed. Please try again.');
  }
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(suggestKeywordsHandler);
  return handler(req);
}
