import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { AuthError, logError, formatErrorResponse } from '@/lib/errors';

async function validateMediaHandler(
  req: NextRequest,
  userId: string,
  mediaId: string
): Promise<Response> {
  try {
    const mediaRepo = new MediaRepository();
    const record = await mediaRepo.getMediaById(mediaId);

    if (!record || record.userId !== userId) {
      return NextResponse.json(
        { error: 'Media file not found or does not belong to you', code: 'INVALID_MEDIA' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      mediaId: record.mediaId,
      mediaType: record.mediaType,
    });
  } catch (error) {
    logError(error as Error, { endpoint: `/api/media/${mediaId}/validate`, method: 'POST', userId });

    if (error instanceof AuthError) {
      return NextResponse.json(formatErrorResponse(error), { status: error.statusCode });
    }

    return NextResponse.json(
      { error: 'An error occurred, please try again', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> }
) {
  const { mediaId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    return validateMediaHandler(request, userId, mediaId);
  });
  return handler(req);
}
