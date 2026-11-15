/**
 * Finish a password reset: sets a new password with the emailed token.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { validatePassword } from '@/lib/validation';
import { getPasswordResetService, INVALID_LINK_MESSAGE } from '@/lib/auth/passwordReset';
import { logError } from '@/lib/errors';


async function resetPasswordHandler(req: NextRequest): Promise<Response> {
  try {
    let body: { token?: unknown; password?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const password = typeof body.password === 'string' ? body.password : '';
    const validation = validatePassword(password);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || 'Invalid password', field: 'password' },
        { status: 400 }
      );
    }

    const ok = await getPasswordResetService().resetPassword(body.token, password);
    if (!ok) {
      return NextResponse.json({ success: false, error: INVALID_LINK_MESSAGE, field: 'token' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error as Error, { endpoint: '/api/auth/reset-password', method: 'POST' });
    return NextResponse.json({ success: false, error: 'An error occurred. Please try again.' }, { status: 500 });
  }
}

// 10 attempts per 15 minutes per IP
export const POST = withRateLimit(resetPasswordHandler, 10, 15 * 60 * 1000);
