import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { validateEmail, validatePassword } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { UserRepository } from '@/lib/db/userRepository';
import { AuthError, AuthErrors, logError, formatErrorResponse } from '@/lib/errors';

async function loginHandler(req: NextRequest): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      throw AuthErrors.MISSING_FIELD('email');
    }

    if (!password || typeof password !== 'string') {
      throw AuthErrors.MISSING_FIELD('password');
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      throw AuthErrors.INVALID_EMAIL();
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw AuthErrors.INVALID_PASSWORD();
    }

    // Query user by email from DynamoDB
    const userRepository = new UserRepository();
    const user = await userRepository.getUserByEmail(email);

    // Return generic error if user not found (don't reveal if email exists)
    if (!user) {
      throw AuthErrors.INVALID_CREDENTIALS();
    }

    // Verify password hash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    // Return generic error if password is wrong (don't reveal which credential was incorrect)
    if (!isPasswordValid) {
      throw AuthErrors.INVALID_CREDENTIALS();
    }

    // Generate JWT token
    const token = generateToken(user.userId, user.email);

    // Prepare user data (exclude password hash)
    const userData = {
      id: user.userId,
      email: user.email,
      name: user.name,
      bio: user.bio,
      createdAt: user.createdAt,
      lastModified: user.lastModified,
    };

    // Create response with user data
    const response = NextResponse.json(
      {
        success: true,
        token,
        user: userData,
      },
      { status: 200 }
    );

    // Set HTTP-only cookie with token
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    // Log error with context
    logError(error as Error, {
      endpoint: '/api/auth/login',
      method: 'POST',
    });

    // Handle AuthError instances
    if (error instanceof AuthError) {
      return NextResponse.json(
        formatErrorResponse(error),
        { status: error.statusCode }
      );
    }

    // Return generic error for unexpected errors
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 5 requests per 15 minutes
export const POST = withRateLimit(loginHandler, 5, 15 * 60 * 1000);
