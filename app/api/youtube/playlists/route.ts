/**
 * POST /api/youtube/playlists
 * Creates a playlist on the connected channel. Body: { title, privacyStatus? }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/withAuth';
import { getYouTubeAccess } from '@/lib/services/youtubeAccess';
import { createPlaylist } from '@/lib/services/youtubeClient';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

const Body = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Name the playlist')
    .max(150, 'Playlist names can be up to 150 characters')
    .refine((t) => !/[<>]/.test(t), 'Playlist names can’t contain < or >'),
  privacyStatus: z.enum(['public', 'unlisted', 'private']).default('public'),
});

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const body = Body.parse(await request.json().catch(() => ({})));
      const { accessToken } = await getYouTubeAccess(userId);
      const playlist = await createPlaylist(accessToken, body);
      return NextResponse.json({ playlist }, { status: 201 });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/playlists', userId });
    }
  });
  return handler(req);
}
