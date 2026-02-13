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
} from '@/lib/validation';

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
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );
      }

      // Return user data without password hash
      return NextResponse.json({
        success: true,
        user: {
          id: user.userId,
          email: user.email,
          name: user.name,
          bio: user.bio,
        },
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
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
      const { name, email, bio } = body;

      // Validate and sanitize inputs
      const updates: { name?: string; email?: string; bio?: string } = {};
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

      // Return validation errors if any
      if (Object.keys(errors).length > 0) {
        return NextResponse.json(
          { success: false, error: 'Validation failed', errors },
          { status: 400 }
        );
      }

      // Check if there are any updates to apply
      if (Object.keys(updates).length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid fields to update' },
          { status: 400 }
        );
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
          bio: updatedUser.bio,
          lastModified: updatedUser.lastModified,
        },
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);

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
