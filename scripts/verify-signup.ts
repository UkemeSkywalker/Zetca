/**
 * Verification script for signup endpoint
 * Checks that the user was created with a hashed password
 */

import { UserRepository } from '../lib/db/userRepository';

async function verifySignup() {
  console.log('🔍 Verifying signup endpoint...\n');

  const repo = new UserRepository();

  try {
    // Check the user we just created
    const email = 'john.doe@example.com';
    console.log(`Looking up user: ${email}`);
    
    const user = await repo.getUserByEmail(email);
    
    if (!user) {
      console.log('❌ User not found in DynamoDB');
      process.exit(1);
    }
    
    console.log('✅ User found in DynamoDB:');
    console.log(`   - User ID: ${user.userId}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.name}`);
    console.log(`   - Created At: ${user.createdAt}`);
    console.log(`   - Last Modified: ${user.lastModified}`);
    console.log(`   - Password Hash: ${user.passwordHash.substring(0, 30)}...`);
    console.log();
    
    // Verify password is hashed (bcrypt hashes start with $2b$ or $2a$)
    if (user.passwordHash.startsWith('$2b$') || user.passwordHash.startsWith('$2a$')) {
      console.log('✅ Password is properly hashed with bcrypt');
    } else {
      console.log('❌ Password does not appear to be hashed with bcrypt');
      process.exit(1);
    }
    
    // Verify password is not stored in plain text
    if (user.passwordHash === 'securepass123') {
      console.log('❌ Password is stored in plain text!');
      process.exit(1);
    } else {
      console.log('✅ Password is not stored in plain text');
    }
    
    console.log('\n🎉 All verifications passed!');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

verifySignup();
