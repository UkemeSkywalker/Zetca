/**
 * POST /api/media/videos/:mediaId/complete
 * Joins the uploaded parts into the final video, then starts its transcript.
 * Body: { parts: [{ partNumber, etag }], durationSeconds?, width?, height? } → { media }
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { VideoUploadService } from '@/lib/services/videoUploadService';
import { readJson, videoUploadErrorResponse } from '@/lib/media/videoUploadResponse';
import { TranscriptService } from '@/lib/services/transcriptService';

export async function POST(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = await readJson(request);
      const media = await new VideoUploadService().complete(userId, mediaId, {
        parts: body.parts,
        durationSeconds: body.durationSeconds,
        width: body.width,
        height: body.height,
      });
      // Transcribe while the creator fills in the details
      after(() =>
        new TranscriptService().start(userId, mediaId).catch((e) =>
          console.error(`Transcript for ${mediaId} didn't start: ${(e as Error)?.message ?? e}`)
        )
      );
      return NextResponse.json({ media });
    } catch (error) {
      return videoUploadErrorResponse(error, { endpoint: '/api/media/videos/[mediaId]/complete', method: 'POST', userId });
    }
  });
  return handler(req);
}
