/**
 * GET /api/media/videos/:mediaId/transcript
 * The video's transcript progress: { status, language? }. Checks on the
 * transcription jobs each time, and starts a transcript if there isn't one.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { TranscriptError, TranscriptService } from '@/lib/services/transcriptService';
import { logError } from '@/lib/errors';

export async function GET(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const service = new TranscriptService();
      const state = await service.refresh(userId, mediaId);
      if (service.needsStart(state)) {
        // Pulling the audio takes a while, so it runs after this response
        after(() =>
          service.start(userId, mediaId).catch((e) => console.error(`Transcript for ${mediaId} didn't start: ${(e as Error)?.message ?? e}`))
        );
        return NextResponse.json({ status: 'extracting' });
      }
      return NextResponse.json({ status: state!.status, ...(state!.language ? { language: state!.language } : {}) });
    } catch (error) {
      if (error instanceof TranscriptError) {
        return NextResponse.json({ error: error.message }, { status: error.statusCode });
      }
      logError(error as Error, { endpoint: '/api/media/videos/[mediaId]/transcript', userId });
      return NextResponse.json({ error: 'Couldn’t check the transcript' }, { status: 500 });
    }
  });
  return handler(req);
}
