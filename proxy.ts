/**
 * Hides developer-only pages and endpoints in production. They show token
 * contents and configuration that are useful locally but shouldn't be public.
 */

import { NextResponse } from 'next/server';

export function proxy() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/debug-auth/:path*', '/debug-token/:path*', '/test-auth/:path*', '/demo/:path*', '/api/test-config/:path*'],
};
