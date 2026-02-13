/**
 * JWT token generation and verification utilities
 */

import jwt from 'jsonwebtoken';
import { getConfig } from '../config';
import { NextRequest } from 'next/server';

export interface TokenPayload {
  userId: string;
  email: string;
  iat: number;  // issued at
  exp: number;  // expiration
}

/**
 * Generate a JWT token for a user
 * @param userId - Unique user identifier
 * @param email - User email address
 * @param expiresIn - Optional custom expiration (e.g., '1h', '1s', '24h'). Defaults to config value
 * @returns JWT token string
 */
export function generateToken(userId: string, email: string, expiresIn?: string): string {
  const config = getConfig();
  
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  const payload = {
    userId,
    email,
  };

  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: expiresIn || `${config.jwtExpirationHours}h`,
  } as jwt.SignOptions);
}

/**
 * Verify and decode a JWT token
 * @param token - JWT token string to verify
 * @returns Decoded token payload or null if invalid/expired
 */
export function verifyToken(token: string): TokenPayload | null {
  const config = getConfig();
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Extract JWT token from Next.js request
 * Checks both Authorization header and cookies
 * @param req - Next.js request object
 * @returns Token string or null if not found
 */
export function getTokenFromRequest(req: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookies
  const token = req.cookies.get('auth_token')?.value;
  return token || null;
}
