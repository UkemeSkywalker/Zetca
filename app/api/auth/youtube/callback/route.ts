/**
 * YouTube (Google OAuth) callback
 * GET /api/auth/youtube/callback
 *
 * Validates state, exchanges the code for tokens, looks up the chosen
 * channel, and stores it with the refresh token encrypted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { UserRepository } from '@/lib/db/userRepository';
import { encryptToken } from '@/lib/crypto/tokenCipher';
import {
  exchangeCode,
  getMyChannel,
  YouTubeAuthError,
  YOUTUBE_RETURN_COOKIE,
  YOUTUBE_RETURN_PATHS,
} from '@/lib/services/youtubeClient';
import { logError } from '@/lib/errors';

function profileRedirect(req: NextRequest, query: string, path = '/dashboard/profile'): Response {
  const response = NextResponse.redirect(new URL(`${path}?${query}`, req.url));
  // The state and return page are single-use
  for (const name of ['youtube_oauth_state', YOUTUBE_RETURN_COOKIE]) {
    response.cookies.set(name, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  }
  return response;
}

async function youtubeCallbackHandler(req: NextRequest, userId: string): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (searchParams.get('error')) return profileRedirect(req, 'youtube_error=denied');

  const storedState = req.cookies.get('youtube_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) return profileRedirect(req, 'youtube_error=state_mismatch');
  if (!code) return profileRedirect(req, 'youtube_error=exchange_failed');

  try {
    const tokens = await exchangeCode(code);
    const channel = await getMyChannel(tokens.accessToken);
    await new UserRepository().connectYouTube(userId, {
      channelId: channel.id,
      channelTitle: channel.title,
      channelCustomUrl: channel.customUrl,
      channelThumbnailUrl: channel.thumbnailUrl,
      refreshTokenEnc: encryptToken(tokens.refreshToken),
      scopes: tokens.scopes,
    });
    // Errors always show on the profile page; success goes back where the user started
    const returnTo = req.cookies.get(YOUTUBE_RETURN_COOKIE)?.value;
    const path = returnTo && (YOUTUBE_RETURN_PATHS as readonly string[]).includes(returnTo) ? returnTo : undefined;
    return profileRedirect(req, 'youtube=connected', path);
  } catch (error) {
    const code = error instanceof YouTubeAuthError ? error.code : 'exchange_failed';
    logError(error as Error, { endpoint: '/api/auth/youtube/callback', userId, code });
    return profileRedirect(req, `youtube_error=${code}`);
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(youtubeCallbackHandler);
  return authHandler(req);
}

// 5 requests per 15 minutes
export const GET = withRateLimit(handler, 5, 15 * 60 * 1000);
