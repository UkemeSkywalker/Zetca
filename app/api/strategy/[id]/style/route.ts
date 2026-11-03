/**
 * PUT /api/strategy/:id/style: sets the campaign's design style, which every
 * new post's visual follows. Body: { recipe_id, model?, on_new_posts? }, or
 * { recipe_id: null } to remove it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { getStrategyRepository } from '@/lib/services/container';
import { CampaignStyleSchema } from '@/lib/models/strategy';
import { recipeById } from '@/lib/design/recipes';
import { imageModel } from '@/lib/billing/aiModels';
import { handleRouteError, jsonError } from '@/lib/api/routeHelpers';

const BodySchema = z.union([z.object({ recipe_id: z.null() }), CampaignStyleSchema]);

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = BodySchema.parse(await request.json().catch(() => ({})));
      const repo = getStrategyRepository();
      if (!(await repo.getStrategyById(id, userId))) return jsonError('Strategy not found', 404);
      if (body.recipe_id === null) {
        await repo.updateDesignStyle(id, userId, null);
        return NextResponse.json({ design_style: null });
      }
      const style = body as z.infer<typeof CampaignStyleSchema>;
      if (!recipeById(style.recipe_id)) return jsonError('That style doesn’t exist', 400);
      // Only image models from the catalogue
      const model = style.model && imageModel(style.model).id === style.model ? style.model : undefined;
      const saved = { recipe_id: style.recipe_id, on_new_posts: style.on_new_posts, ...(model ? { model } : {}) };
      await repo.updateDesignStyle(id, userId, saved);
      return NextResponse.json({ design_style: saved });
    } catch (error) {
      return handleRouteError(error, 'Couldn’t save the style. Please try again.');
    }
  });
  return handler(req);
}
