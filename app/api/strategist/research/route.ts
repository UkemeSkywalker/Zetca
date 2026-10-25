/**
 * POST /api/strategist/research: starts Talk to Zetca's brand research from the
 * user's message (with any links). Body: { message }. Returns at once; the
 * page checks GET /api/strategist/research/:id for progress.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { ResearchStartSchema, toPublicResearch } from '@/lib/models/brandResearch';
import { getBrandResearchService } from '@/lib/services/container';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { message } = ResearchStartSchema.parse(await request.json().catch(() => ({})));
      const research = await getBrandResearchService().start(userId, message);
      return NextResponse.json({ research: toPublicResearch(research) }, { status: 202 });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'POST /api/strategist/research', userId });
    }
  });
  return handler(req);
}
