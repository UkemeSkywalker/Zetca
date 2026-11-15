/**
 * Start a password reset: emails a single-use link if the address has an account.
 * The answer is the same whether or not it does, and the lookup and email run
 * after the response is sent, so timing doesn't reveal it either.
 */

import { NextRequest, NextResponse, after } from 'next/server';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { validateAndSanitizeEmail } from '@/lib/validation';
import { getPasswordResetService, FORGOT_PASSWORD_MESSAGE } from '@/lib/auth/passwordReset';
import { logError } from '@/lib/errors';


async function forgotPasswordHandler(req: NextRequest): Promise<Response> {
  let email: unknown;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request', field: 'email' }, { status: 400 });
  }

  const validation = validateAndSanitizeEmail(typeof email === 'string' ? email : '');
  if (!validation.isValid) {
    return NextResponse.json(
      { success: false, error: validation.error || 'Invalid email', field: 'email' },
      { status: 400 }
    );
  }

  const address = validation.sanitized!;
  after(async () => {
    try {
      await getPasswordResetService().requestReset(address);
    } catch (error) {
      logError(error as Error, { endpoint: '/api/auth/forgot-password', method: 'POST' });
    }
  });

  return NextResponse.json({ success: true, message: FORGOT_PASSWORD_MESSAGE });
}

// 5 requests per 15 minutes per IP (each address also gets at most 3 emails an hour)
export const POST = withRateLimit(forgotPasswordHandler, 5, 15 * 60 * 1000);
