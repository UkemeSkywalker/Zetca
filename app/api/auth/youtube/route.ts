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

async function youtubeOAuthHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    if (!getConfig().youtubeClientId) {
      return NextResponse.redirect(new URL('/dashboard/profile?youtube_error=not_configured', req.url));
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
    return response;
  } catch (error) {
    logError(error as Error, { endpoint: '/api/auth/youtube', method: 'GET', userId });
    return NextResponse.redirect(new URL('/dashboard/profile?youtube_error=initiation_failed', req.url));
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(youtubeOAuthHandler);
  return authHandler(req);
}

// 5 requests per 15 minutes
export const GET = withRateLimit(handler, 5, 15 * 60 * 1000);
