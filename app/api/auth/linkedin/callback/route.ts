/**
 * LinkedIn OAuth 2.0 Callback Endpoint
 * GET /api/auth/linkedin/callback
 *
 * Handles the redirect from LinkedIn after user authorization.
 * Validates state, exchanges code for tokens, fetches profile,
 * and stores LinkedIn data on the user record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { getConfig } from '@/lib/config';
import { UserRepository } from '@/lib/db/userRepository';
import { logError } from '@/lib/errors';

const PROFILE_URL = '/dashboard/profile';

function profileRedirect(req: NextRequest, query: string): Response {
  return NextResponse.redirect(new URL(`${PROFILE_URL}?${query}`, req.url));
}

async function linkedinCallbackHandler(req: NextRequest, userId: string): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // If LinkedIn returned an error (e.g. user denied consent)
  if (error) {
    return profileRedirect(req, 'linkedin_error=denied');
  }

  // Validate state parameter against cookie to prevent CSRF
  const storedState = req.cookies.get('linkedin_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    return profileRedirect(req, 'linkedin_error=state_mismatch');
  }

  if (!code) {
    return profileRedirect(req, 'linkedin_error=exchange_failed');
  }

  try {
    const config = getConfig();

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.linkedinRedirectUri,
        client_id: config.linkedinClientId,
        client_secret: config.linkedinClientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      logError(new Error(`LinkedIn token exchange failed: ${tokenResponse.status}`), {
        endpoint: '/api/auth/linkedin/callback',
        userId,
      });
      return profileRedirect(req, 'linkedin_error=exchange_failed');
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string = tokenData.access_token;

    if (!accessToken) {
      logError(new Error('LinkedIn token response missing access_token'), {
        endpoint: '/api/auth/linkedin/callback',
        userId,
      });
      return profileRedirect(req, 'linkedin_error=exchange_failed');
    }

    // Fetch user profile from LinkedIn UserInfo endpoint
    const userInfoResponse = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      logError(new Error(`LinkedIn UserInfo failed: ${userInfoResponse.status}`), {
        endpoint: '/api/auth/linkedin/callback',
        userId,
      });
      return profileRedirect(req, 'linkedin_error=exchange_failed');
    }

    const profile = await userInfoResponse.json();
    const { sub, name, picture, email } = profile;

    if (!sub || !name) {
      logError(new Error('LinkedIn profile missing required fields (sub or name)'), {
        endpoint: '/api/auth/linkedin/callback',
        userId,
      });
      return profileRedirect(req, 'linkedin_error=exchange_failed');
    }

    // Validate picture URL is HTTPS if present
    const pictureUrl = typeof picture === 'string' && picture.startsWith('https://') ? picture : undefined;

    // Sanitize name and email before storing
    const sanitizedName = String(name).trim().slice(0, 200);
    const sanitizedEmail = typeof email === 'string' ? email.trim().slice(0, 320) : undefined;

    // Store LinkedIn data on the user record
    const userRepository = new UserRepository();
    await userRepository.connectLinkedIn(userId, {
      linkedinSub: sub,
      linkedinAccessToken: accessToken,
      linkedinName: sanitizedName,
      linkedinPictureUrl: pictureUrl,
      linkedinEmail: sanitizedEmail,
    });

    // Clear the OAuth state cookie and redirect with success
    const response = profileRedirect(req, 'linkedin=connected');
    (response as NextResponse).cookies.set('linkedin_oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err) {
    logError(err as Error, {
      endpoint: '/api/auth/linkedin/callback',
      method: 'GET',
      userId,
    });
    return profileRedirect(req, 'linkedin_error=exchange_failed');
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(linkedinCallbackHandler);
  return authHandler(req);
}

// Apply rate limiting: 5 requests per 15 minutes
export const GET = withRateLimit(handler, 5, 15 * 60 * 1000);
