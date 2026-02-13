import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    // Create response with success message
    const response = NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );

    // Clear the authentication cookie by setting it with an expired date
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    return response;
  } catch (error) {
    logError(error as Error, {
      endpoint: '/api/auth/logout',
      method: 'POST',
    });
    
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
