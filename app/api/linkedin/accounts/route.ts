/**
 * The user's connected LinkedIn accounts
 * GET   /api/linkedin/accounts            → { accounts } (default first, no tokens)
 * PATCH /api/linkedin/accounts { defaultId } → makes that account the default
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { UserRepository } from '@/lib/db/userRepository';
import { publicAccount } from '@/lib/linkedin/accounts';
import { logError } from '@/lib/errors';

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (_req: NextRequest, userId: string) => {
    try {
      const accounts = await new UserRepository().getLinkedInAccounts(userId);
      return NextResponse.json({ accounts: accounts.map(publicAccount) });
    } catch (err) {
      logError(err as Error, { endpoint: '/api/linkedin/accounts', method: 'GET', userId });
      return NextResponse.json({ error: 'Couldn’t load your LinkedIn accounts' }, { status: 500 });
    }
  });
  return handler(req);
}

export async function PATCH(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    const body = (await request.json().catch(() => ({}))) as { defaultId?: unknown };
    if (typeof body.defaultId !== 'string' || !body.defaultId) {
      return NextResponse.json({ error: 'Choose an account' }, { status: 400 });
    }
    try {
      const accounts = await new UserRepository().setDefaultLinkedInAccount(userId, body.defaultId);
      return NextResponse.json({ accounts: accounts.map(publicAccount) });
    } catch (err) {
      if ((err as Error).message === 'LinkedIn account not connected') {
        return NextResponse.json({ error: 'That LinkedIn account isn’t connected' }, { status: 404 });
      }
      logError(err as Error, { endpoint: '/api/linkedin/accounts', method: 'PATCH', userId });
      return NextResponse.json({ error: 'Couldn’t change the default account' }, { status: 500 });
    }
  });
  return handler(req);
}
