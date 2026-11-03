/**
 * PUT /api/strategist/research/:researchId/style: the campaign look picked from
 * the suggested styles. Body: { style: "<style id>" } or { style: null }.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { toPublicResearch } from '@/lib/models/brandResearch';
import { getBrandResearchService } from '@/lib/services/container';
import { ResearchNotFoundError } from '@/lib/services/brandResearchService';
import { recipeById } from '@/lib/design/recipes';
import { designErrorResponse } from '@/lib/design/routeErrors';

const BodySchema = z.object({ style: z.string().max(40).nullable() });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ researchId: string }> }) {
  const { researchId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { style } = BodySchema.parse(await request.json().catch(() => ({})));
      if (style && !recipeById(style)) return NextResponse.json({ error: 'That style doesn’t exist', code: 'INVALID_INPUT' }, { status: 400 });
      const research = await getBrandResearchService().chooseStyle(userId, researchId, style);
      return NextResponse.json({ research: toPublicResearch(research) });
    } catch (error) {
      if (error instanceof ResearchNotFoundError) return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 });
      return designErrorResponse(error, { endpoint: 'PUT /api/strategist/research/[researchId]/style', userId });
    }
  });
  return handler(req);
}
