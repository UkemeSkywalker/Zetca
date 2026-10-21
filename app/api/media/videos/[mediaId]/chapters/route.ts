/**
 * POST /api/media/videos/:mediaId/chapters
 * Chapters for the video from its transcript: { chapters: [{ seconds, title }] }.
 * An empty list means the video doesn't split into 3+ chapters.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { TranscriptError, TranscriptService } from '@/lib/services/transcriptService';
import { getChapterAgent } from '@/lib/services/container';
import { chaptersFromPicks } from '@/lib/models/chapters';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { withTimeout } from '@/lib/api/routeHelpers';
import { getConfig } from '@/lib/config';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

export async function POST(req: NextRequest, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const transcript = await new TranscriptService().get(userId, mediaId);
      if (!transcript) return NextResponse.json({ error: 'The transcript isn’t ready yet' }, { status: 409 });
      const media = await new MediaRepository().getMediaById(mediaId);
      const picks = await withTimeout(getChapterAgent().pick(transcript), getConfig().agentTimeoutSeconds, 'Chapters took too long. Try again.');
      return NextResponse.json({ chapters: chaptersFromPicks(picks, transcript, media?.durationSeconds) });
    } catch (error) {
      if (error instanceof TranscriptError) return NextResponse.json({ error: error.message }, { status: error.statusCode });
      return youtubeErrorResponse(error, { endpoint: '/api/media/videos/[mediaId]/chapters', userId });
    }
  });
  return handler(req);
}
