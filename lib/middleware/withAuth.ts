/**
 * Authentication middleware for protecting API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../auth/jwt';

export interface AuthenticatedRequest extends NextRequest {
  userId: string;
}

/**
 * Middleware to validate JWT tokens and protect routes
 * Extracts userId from valid tokens and passes it to the handler
 * 
 * @param handler - Route handler that receives the request and userId
 * @returns Response from handler or error response
 */
export async function withAuth(
  handler: (req: NextRequest, userId: string) => Promise<Response>
): Promise<(req: NextRequest) => Promise<Response>> {
  return async (req: NextRequest): Promise<Response> => {
    // Extract token from request
    const token = getTokenFromRequest(req);

    // Handle missing token
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    const payload = verifyToken(token);

    // Handle invalid or expired token
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Call handler with userId
    return handler(req, payload.userId);
  };
}
