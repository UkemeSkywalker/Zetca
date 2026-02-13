/**
 * Profile API endpoint for retrieving and updating user profile data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { UserRepository } from '@/lib/db/userRepository';
import {
  validateAndSanitizeEmail,
  validateAndSanitizeName,
  validateAndSanitizeBio,
  validateAndSanitizeCompany,
} from '@/lib/validation';
import { AuthError, AuthErrors, logError, formatErrorResponse } from '@/lib/errors';

/**
 * GET /api/profile
 * Retrieve authenticated user's profile
 */
export async function GET(req: NextRequest) {
  const authHandler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const userRepo = new UserRepository();
      const user = await userRepo.getUserById(userId);

      if (!user) {
        throw new AuthError('User not found', 404, undefined, 'USER_NOT_FOUND');
      }

      // Return user data without password hash
      return NextResponse.json({
        success: true,
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          company: user.company,
          bio: user.bio,
        },
      });
    } catch (error) {
      logError(error as Error, {
        endpoint: '/api/profile',
        method: 'GET',
        userId,
      });

      if (error instanceof AuthError) {
        return NextResponse.json(
          { success: false, ...formatErrorResponse(error) },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }
  });

  return authHandler(req);
}

/**
 * PUT /api/profile
 * Update authenticated user's profile
 */
export async function PUT(req: NextRequest) {
  const authHandler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      // Parse request body
      const body = await request.json();
      const { name, email, bio, company } = body;

      // Validate and sanitize inputs
      const updates: { name?: string; email?: string; bio?: string; company?: string } = {};
      const errors: Record<string, string> = {};

      // Validate name if provided
      if (name !== undefined) {
        const nameValidation = validateAndSanitizeName(name);
        if (!nameValidation.isValid) {
          errors.name = nameValidation.error || 'Invalid name';
        } else {
          updates.name = nameValidation.sanitized;
        }
      }

      // Validate email if provided
      if (email !== undefined) {
        const emailValidation = validateAndSanitizeEmail(email);
        if (!emailValidation.isValid) {
          errors.email = emailValidation.error || 'Invalid email';
        } else {
          updates.email = emailValidation.sanitized;
        }
      }

      // Validate bio if provided
      if (bio !== undefined) {
        const bioValidation = validateAndSanitizeBio(bio);
        if (!bioValidation.isValid) {
          errors.bio = bioValidation.error || 'Invalid bio';
        } else {
          updates.bio = bioValidation.sanitized;
        }
      }

      // Validate company if provided
      if (company !== undefined) {
        const companyValidation = validateAndSanitizeCompany(company);
        if (!companyValidation.isValid) {
          errors.company = companyValidation.error || 'Invalid company';
        } else {
          updates.company = companyValidation.sanitized;
        }
      }

      // Return validation errors if any
      if (Object.keys(errors).length > 0) {
        throw new AuthError('Validation failed', 400, undefined, 'VALIDATION_ERROR');
      }

      // Check if there are any updates to apply
      if (Object.keys(updates).length === 0) {
        throw new AuthError('No valid fields to update', 400, undefined, 'NO_UPDATES');
      }

      // Update user in DynamoDB
      const userRepo = new UserRepository();
      const updatedUser = await userRepo.updateUser(userId, updates);

      // Return updated user data without password hash
      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.userId,
          email: updatedUser.email,
          name: updatedUser.name,
          company: updatedUser.company,
          bio: updatedUser.bio,
          lastModified: updatedUser.lastModified,
        },
      });
    } catch (error: any) {
      logError(error as Error, {
        endpoint: '/api/profile',
        method: 'PUT',
        userId,
      });

      if (error instanceof AuthError) {
        return NextResponse.json(
          { success: false, ...formatErrorResponse(error) },
          { status: error.statusCode }
        );
      }

      // Handle user not found error
      if (error.name === 'ConditionalCheckFailedException') {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      );
    }
  });

  return authHandler(req);
}
