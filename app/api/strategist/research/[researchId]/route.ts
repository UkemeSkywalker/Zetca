/**
 * GET /api/strategist/research/:researchId: the research so far
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { toPublicResearch } from '@/lib/models/brandResearch';
import { getBrandResearchService } from '@/lib/services/container';
import { ResearchNotFoundError } from '@/lib/services/brandResearchService';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ researchId: string }> }) {
  const { researchId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      return NextResponse.json({ research: toPublicResearch(await getBrandResearchService().get(userId, researchId)) });
    } catch (error) {
      if (error instanceof ResearchNotFoundError) return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 });
      return designErrorResponse(error, { endpoint: 'GET /api/strategist/research/[researchId]', userId });
    }
  });
  return handler(req);
}
