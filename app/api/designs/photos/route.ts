/**
 * POST /api/designs/photos: copies a Pixabay photo into the user's storage.
 * Body: { pixabayId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { StockPhotoService } from '@/lib/services/stockPhotoService';
import { designErrorResponse } from '@/lib/design/routeErrors';

const SaveSchema = z.object({ pixabayId: z.number().int().positive() });

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { pixabayId } = SaveSchema.parse(await request.json().catch(() => ({})));
      return NextResponse.json({ photo: await new StockPhotoService().save(userId, pixabayId) }, { status: 201 });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'POST /api/designs/photos', userId });
    }
  });
  return handler(req);
}
