/**
 * GET /api/designs/photos/search?q=gym&orientation=vertical&page=1
 * Free stock photos from Pixabay
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { StockPhotoService, type Orientation } from '@/lib/services/stockPhotoService';
import { designErrorResponse } from '@/lib/design/routeErrors';

const ORIENTATIONS: Orientation[] = ['all', 'horizontal', 'vertical'];

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const params = request.nextUrl.searchParams;
      const orientation = ORIENTATIONS.find((o) => o === params.get('orientation')) ?? 'all';
      const page = Number(params.get('page')) || 1;
      const photos = await new StockPhotoService().search(params.get('q') ?? '', { orientation, page });
      return NextResponse.json({ photos });
    } catch (error) {
      return designErrorResponse(error, { endpoint: 'GET /api/designs/photos/search', userId });
    }
  });
  return handler(req);
}
