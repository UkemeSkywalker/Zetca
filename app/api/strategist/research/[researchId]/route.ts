/**
 * GET /api/strategist/research/:researchId: the research so far
 * PATCH /api/strategist/research/:researchId: a change the user made by hand to
 * the brand result. Body: any of the BrandEdit fields (lists are sent whole).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { BrandEditSchema, toPublicResearch } from '@/lib/models/brandResearch';
import { getBrandResearchService } from '@/lib/services/container';
import { ResearchNotFoundError, ResearchNotReadyError } from '@/lib/services/brandResearchService';
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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ researchId: string }> }) {
  const { researchId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const edit = BrandEditSchema.parse(await request.json().catch(() => ({})));
      return NextResponse.json({ research: toPublicResearch(await getBrandResearchService().edit(userId, researchId, edit)) });
    } catch (error) {
      if (error instanceof ResearchNotFoundError) return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 });
      if (error instanceof ResearchNotReadyError) return NextResponse.json({ error: error.message, code: 'NOT_READY' }, { status: 409 });
      return designErrorResponse(error, { endpoint: 'PATCH /api/strategist/research/[researchId]', userId });
    }
  });
  return handler(req);
}
