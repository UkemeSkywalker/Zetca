/**
 * Verification script to check company field in DynamoDB
 */

import { UserRepository } from '../lib/db/userRepository';

async function verifyCompanyField() {
  console.log('=== Verifying Company Field in DynamoDB ===\n');

  const userRepo = new UserRepository();

  try {
    // Get user by email
    const user = await userRepo.getUserByEmail('updated@example.com');

    if (!user) {
      console.log('✗ User not found');
      return;
    }

    console.log('✓ User found in DynamoDB');
    console.log('\nUser Details:');
    console.log(`  ID: ${user.userId}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Company: ${user.company || '(not set)'}`);
    console.log(`  Bio: ${user.bio || '(not set)'}`);
    console.log(`  Created At: ${user.createdAt}`);
    console.log(`  Last Modified: ${user.lastModified}`);

    console.log('\nCompany Field Verification:');
    if (user.company === 'Acme Corporation') {
      console.log('  ✓ Company field is correctly set to "Acme Corporation"');
    } else if (user.company) {
      console.log(`  ⚠ Company field has unexpected value: "${user.company}"`);
    } else {
      console.log('  ✗ Company field is not set');
    }

  } catch (error) {
    console.error('Error verifying company field:', error);
  }

  console.log('\n=== Verification Complete ===');
}

verifyCompanyField();
