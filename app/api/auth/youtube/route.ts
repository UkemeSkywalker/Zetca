/**
 * YouTube (Google OAuth) initiation
 * GET /api/auth/youtube
 *
 * Sends the signed-in user to Google to pick a YouTube channel and grant
 * Zetca permission to upload and manage its videos.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { getConfig } from '@/lib/config';
import { buildAuthUrl } from '@/lib/services/youtubeClient';
import { logError } from '@/lib/errors';
import { YOUTUBE_RETURN_COOKIE, YOUTUBE_RETURN_PATHS } from '@/lib/services/youtubeClient';
import { siteUrl } from '@/lib/http/siteUrl';

async function youtubeOAuthHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    if (!getConfig().youtubeClientId) {
      return NextResponse.redirect(siteUrl('/dashboard/profile?youtube_error=not_configured'));
    }
    // Random state, checked against this cookie in the callback to prevent CSRF
    const state = crypto.randomBytes(32).toString('hex');
    const response = NextResponse.redirect(buildAuthUrl(state));
    response.cookies.set('youtube_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });
    // Where to land after connecting; only known pages, so it can't be an open redirect
    const returnTo = req.nextUrl.searchParams.get('return');
    if (returnTo && (YOUTUBE_RETURN_PATHS as readonly string[]).includes(returnTo)) {
      response.cookies.set(YOUTUBE_RETURN_COOKIE, returnTo, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60,
        path: '/',
      });
    }
    return response;
  } catch (error) {
    logError(error as Error, { endpoint: '/api/auth/youtube', method: 'GET', userId });
    return NextResponse.redirect(siteUrl('/dashboard/profile?youtube_error=initiation_failed'));
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(youtubeOAuthHandler);
  return authHandler(req);
}

// 5 requests per 15 minutes
export const GET = withRateLimit(handler, 5, 15 * 60 * 1000);
