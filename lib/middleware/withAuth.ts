/**
 * Authentication middleware for protecting API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTokenFromRequest, verifyToken } from '../auth/jwt';
import { AuthErrors, formatErrorResponse } from '../errors';

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
      const error = AuthErrors.MISSING_TOKEN();
      return NextResponse.json(
        formatErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Verify token
    const payload = verifyToken(token);

    // Handle invalid or expired token
    if (!payload) {
      const error = AuthErrors.INVALID_TOKEN();
      return NextResponse.json(
        formatErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Call handler with userId
    return handler(req, payload.userId);
  };
}
