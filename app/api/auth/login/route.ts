import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { validateEmail, validatePassword } from '@/lib/validation';
import { verifyPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import { UserRepository } from '@/lib/db/userRepository';

async function loginHandler(req: NextRequest): Promise<Response> {
  try {
    // Parse request body
    const body = await req.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Query user by email from DynamoDB
    const userRepository = new UserRepository();
    const user = await userRepository.getUserByEmail(email);

    // Return generic error if user not found (don't reveal if email exists)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password hash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    // Return generic error if password is wrong (don't reveal which credential was incorrect)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
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
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

// Apply rate limiting: 5 requests per 15 minutes
export const POST = withRateLimit(loginHandler, 5, 15 * 60 * 1000);
