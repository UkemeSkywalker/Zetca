/**
 * Profile API endpoint for retrieving user profile data
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { UserRepository } from '@/lib/db/userRepository';

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
