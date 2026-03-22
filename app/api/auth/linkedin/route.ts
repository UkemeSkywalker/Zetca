/**
 * LinkedIn OAuth 2.0 Initiation Endpoint
 * GET /api/auth/linkedin
 *
 * Redirects authenticated users to LinkedIn's authorization page
 * to begin the OAuth 2.0 authorization code flow.
 */

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { getConfig } from '@/lib/config';
import { logError } from '@/lib/errors';

async function linkedinOAuthHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const config = getConfig();

    // Generate cryptographically random state (32 bytes, hex encoded)
    const state = crypto.randomBytes(32).toString('hex');

    // Build LinkedIn authorization URL
    const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', config.linkedinClientId);
    authUrl.searchParams.set('redirect_uri', config.linkedinRedirectUri);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('scope', 'openid profile email w_member_social');

    // Create redirect response
    const response = NextResponse.redirect(authUrl.toString());

    // Store state in HTTP-only cookie with 10-minute expiry
    response.cookies.set('linkedin_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60, // 10 minutes in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    logError(error as Error, {
      endpoint: '/api/auth/linkedin',
      method: 'GET',
      userId,
    });

    // On any unexpected error, redirect to profile with error
    return NextResponse.redirect(new URL('/dashboard/profile?linkedin_error=initiation_failed', req.url));
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(linkedinOAuthHandler);
  return authHandler(req);
}

// Apply rate limiting: 5 requests per 15 minutes
export const GET = withRateLimit(handler, 5, 15 * 60 * 1000);
