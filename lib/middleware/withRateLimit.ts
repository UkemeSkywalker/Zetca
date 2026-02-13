import { NextRequest, NextResponse } from 'next/server';
import { AuthErrors, formatErrorResponse } from '../errors';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute

export function withRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  maxRequests: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
) {
  return async (req: NextRequest): Promise<Response> => {
    // Get client identifier (IP address or forwarded IP)
    const clientIp = 
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const now = Date.now();
    const entry = rateLimitStore.get(clientIp);

    if (!entry || now > entry.resetTime) {
      // Create new entry or reset expired entry
      rateLimitStore.set(clientIp, {
        count: 1,
        resetTime: now + windowMs,
      });
      return handler(req);
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      const error = AuthErrors.RATE_LIMIT_EXCEEDED();
      return NextResponse.json(
        formatErrorResponse(error),
        { 
          status: error.statusCode,
          headers: {
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Increment count
    entry.count++;
    return handler(req);
  };
}
