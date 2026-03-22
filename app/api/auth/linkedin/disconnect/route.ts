/**
 * LinkedIn Disconnect Endpoint
 * POST /api/auth/linkedin/disconnect
 *
 * Removes all LinkedIn connection data from the user's record.
 * Protected with authentication middleware.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { UserRepository } from '@/lib/db/userRepository';
import { logError } from '@/lib/errors';

async function disconnectHandler(req: NextRequest, userId: string): Promise<Response> {
  try {
    const userRepository = new UserRepository();
    await userRepository.disconnectLinkedIn(userId);

    return NextResponse.json({ success: true });
  } catch (err) {
    logError(err as Error, {
      endpoint: '/api/auth/linkedin/disconnect',
      method: 'POST',
      userId,
    });
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect LinkedIn' },
      { status: 500 }
    );
  }
}

async function handler(req: NextRequest): Promise<Response> {
  const authHandler = await withAuth(disconnectHandler);
  return authHandler(req);
}

export const POST = handler;
