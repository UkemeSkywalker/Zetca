/**
 * GET /api/designs/photos/:photoId: a photo saved for the user's designs
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { StockPhotoService } from '@/lib/services/stockPhotoService';
import { designErrorResponse } from '@/lib/design/routeErrors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ photoId: string }> }) {
  const { photoId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const bytes = await new StockPhotoService().read(userId, photoId);
      if (!bytes) return NextResponse.json({ error: 'Photo not found', code: 'NOT_FOUND' }, { status: 404 });
      return new Response(Buffer.from(bytes), {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' },
      });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'GET /api/designs/photos/[photoId]', userId });
    }
  });
  return handler(req);
}
