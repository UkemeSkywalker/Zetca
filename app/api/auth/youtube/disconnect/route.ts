/**
 * YouTube disconnect
 * POST /api/auth/youtube/disconnect
 *
 * Revokes Zetca's access at Google (best effort) and removes the channel
 * and its encrypted token from the user record.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { UserRepository } from '@/lib/db/userRepository';
import { decryptToken } from '@/lib/crypto/tokenCipher';
import { revokeToken } from '@/lib/services/youtubeClient';
import { logError } from '@/lib/errors';
import { forgetYouTubeAccess } from '@/lib/services/youtubeAccess';

async function disconnectHandler(_req: NextRequest, userId: string): Promise<Response> {
  try {
    const users = new UserRepository();
    const user = await users.getUserById(userId);
    if (user?.youtubeRefreshTokenEnc) {
      try {
        await revokeToken(decryptToken(user.youtubeRefreshTokenEnc));
      } catch (error) {
        // Still remove it here; the user can also revoke at myaccount.google.com/permissions
        logError(error as Error, { endpoint: '/api/auth/youtube/disconnect', step: 'revoke', userId });
      }
    }
    await users.disconnectYouTube(userId);
    forgetYouTubeAccess(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/auth/youtube/disconnect', method: 'POST', userId });
    return NextResponse.json({ success: false, error: 'Failed to disconnect YouTube' }, { status: 500 });
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(disconnectHandler);
  return authHandler(req);
}

export const POST = handler;
