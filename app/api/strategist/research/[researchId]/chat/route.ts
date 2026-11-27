/**
 * POST /api/strategist/research/:researchId/chat: a message about the brand
 * result ("make the colours warmer"). The agent changes only the parts it
 * asks about and replies. Body: { message }. Returns the updated research.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { ResearchChatSchema, toPublicResearch } from '@/lib/models/brandResearch';
import { getBrandResearchService } from '@/lib/services/container';
import { ResearchNotFoundError, ResearchNotReadyError } from '@/lib/services/brandResearchService';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function POST(req: NextRequest, { params }: { params: Promise<{ researchId: string }> }) {
  const { researchId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { message } = ResearchChatSchema.parse(await request.json().catch(() => ({})));
      return NextResponse.json({ research: toPublicResearch(await getBrandResearchService().adjust(userId, researchId, message)) });
    } catch (error) {
      if (error instanceof ResearchNotFoundError) return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 });
      if (error instanceof ResearchNotReadyError) return NextResponse.json({ error: error.message, code: 'NOT_READY' }, { status: 409 });
      return designErrorResponse(error, { endpoint: 'POST /api/strategist/research/[researchId]/chat', userId });
    }
  });
  return handler(req);
}
