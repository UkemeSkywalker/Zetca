/**
 * Signup API endpoint
 * Handles user registration with validation, password hashing, and JWT token generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/lib/db/userRepository';
import { hashPassword } from '@/lib/auth/password';
import { generateToken } from '@/lib/auth/jwt';
import {
  validateAndSanitizeEmail,
  validateAndSanitizeName,
  validatePassword,
} from '@/lib/validation';
import { AuthError, AuthErrors, logError, formatErrorResponse } from '@/lib/errors';

interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

interface SignupResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
  };
  error?: string;
  field?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: SignupRequest = await req.json();
    const { name, email, password } = body;

    // Validate and sanitize name
    const nameValidation = validateAndSanitizeName(name);
    if (!nameValidation.isValid) {
      throw new AuthError(nameValidation.error || 'Invalid name', 400, 'name', 'INVALID_NAME');
    }

    // Validate and sanitize email
    const emailValidation = validateAndSanitizeEmail(email);
    if (!emailValidation.isValid) {
      throw new AuthError(emailValidation.error || 'Invalid email', 400, 'email', 'INVALID_EMAIL');
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new AuthError(passwordValidation.error || 'Invalid password', 400, 'password', 'INVALID_PASSWORD');
    }

    const sanitizedName = nameValidation.sanitized!;
    const sanitizedEmail = emailValidation.sanitized!;

    // Initialize repository
    const userRepository = new UserRepository();

    // Check if email already exists
    const existingUser = await userRepository.getUserByEmail(sanitizedEmail);
    if (existingUser) {
      throw AuthErrors.EMAIL_EXISTS();
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in DynamoDB
    const userRecord = await userRepository.createUser(
      sanitizedEmail,
      passwordHash,
      sanitizedName
    );

    // Generate JWT token
    const token = generateToken(userRecord.userId, userRecord.email);

    // Prepare response (exclude password hash)
    const response: SignupResponse = {
      success: true,
      token,
      user: {
        id: userRecord.userId,
        email: userRecord.email,
        name: userRecord.name,
        createdAt: userRecord.createdAt,
      },
    };

    // Create response with HTTP-only cookie
    const nextResponse = NextResponse.json(response, { status: 201 });

    // Set HTTP-only cookie with token
    nextResponse.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return nextResponse;
  } catch (error) {
    // Log error with context
    logError(error as Error, {
      endpoint: '/api/auth/signup',
      method: 'POST',
    });

    // Handle AuthError instances
    if (error instanceof AuthError) {
      return NextResponse.json(
        {
          success: false,
          ...formatErrorResponse(error),
        } as SignupResponse,
        { status: error.statusCode }
      );
    }

    // Return generic error for unexpected errors
    return NextResponse.json(
      {
        success: false,
        error: 'An error occurred during signup',
      } as SignupResponse,
      { status: 500 }
    );
  }
}
