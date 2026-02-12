/**
 * Logout API endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clear authentication cookie and end session
 */
export async function POST(req: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear the auth_token cookie
    response.cookies.set('auth_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: new Date(0), // Set expiration to past date to delete cookie
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
