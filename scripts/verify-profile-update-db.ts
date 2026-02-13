/**
 * Verification script to check profile update in DynamoDB
 */

import { UserRepository } from '../lib/db/userRepository';

async function verifyProfileUpdate() {
  console.log('=== Verifying Profile Update in DynamoDB ===\n');

  const userRepo = new UserRepository();

  try {
    // Get user by email (the updated email)
    const user = await userRepo.getUserByEmail('updated@example.com');

    if (!user) {
      console.log('✗ User not found with updated email');
      return;
    }

    console.log('✓ User found in DynamoDB');
    console.log('\nUser Details:');
    console.log(`  ID: ${user.userId}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Bio: ${user.bio || '(not set)'}`);
    console.log(`  Created At: ${user.createdAt}`);
    console.log(`  Last Modified: ${user.lastModified}`);

    // Verify the data matches what we updated
    const checks = [
      { name: 'Name', expected: 'Updated Test User', actual: user.name },
      { name: 'Email', expected: 'updated@example.com', actual: user.email },
      { name: 'Bio', expected: 'This is my updated bio', actual: user.bio },
    ];

    console.log('\nVerification Checks:');
    checks.forEach(check => {
      if (check.actual === check.expected) {
        console.log(`  ✓ ${check.name} matches: ${check.actual}`);
      } else {
        console.log(`  ✗ ${check.name} mismatch: expected "${check.expected}", got "${check.actual}"`);
      }
    });

    // Verify lastModified is more recent than createdAt
    const createdDate = new Date(user.createdAt);
    const modifiedDate = new Date(user.lastModified);

    console.log('\nTimestamp Verification:');
    if (modifiedDate > createdDate) {
      console.log(`  ✓ lastModified (${user.lastModified}) is after createdAt (${user.createdAt})`);
    } else if (modifiedDate.getTime() === createdDate.getTime()) {
      console.log(`  ⚠ lastModified equals createdAt (user may not have been updated yet)`);
    } else {
      console.log(`  ✗ lastModified is before createdAt (unexpected)`);
    }

  } catch (error) {
    console.error('Error verifying profile update:', error);
  }

  console.log('\n=== Verification Complete ===');
}

verifyProfileUpdate();
