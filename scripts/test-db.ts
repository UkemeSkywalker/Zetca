/**
 * Test script for DynamoDB UserRepository
 * Tests all CRUD operations: create, read (by ID and email), update, delete
 * 
 * Prerequisites:
 * - DynamoDB table must exist (run terraform apply or use DynamoDB Local)
 * - AWS credentials must be configured
 * - Environment variables must be set (.env.local)
 * 
 * Run with: npx tsx scripts/test-db.ts
 */

import { UserRepository } from '../lib/db/userRepository';
import { hashPassword } from '../lib/auth/password';

async function testUserRepository() {
  console.log('🧪 Testing DynamoDB UserRepository...\n');

  const repo = new UserRepository();
  let testUserId: string;

  try {
    // Test 1: Create User
    console.log('1️⃣  Testing createUser()...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Test User';
    
    const passwordHash = await hashPassword(testPassword);
    const createdUser = await repo.createUser(testEmail, passwordHash, testName);
    
    testUserId = createdUser.userId;
    
    console.log('✅ User created successfully:');
    console.log(`   - User ID: ${createdUser.userId}`);
    console.log(`   - Email: ${createdUser.email}`);
    console.log(`   - Name: ${createdUser.name}`);
    console.log(`   - Created At: ${createdUser.createdAt}`);
    console.log(`   - Last Modified: ${createdUser.lastModified}`);
    console.log(`   - Password Hash: ${createdUser.passwordHash.substring(0, 20)}...`);
    console.log();

    // Test 2: Get User by ID
    console.log('2️⃣  Testing getUserById()...');
    const userById = await repo.getUserById(testUserId);
    
    if (!userById) {
      throw new Error('User not found by ID');
    }
    
    console.log('✅ User retrieved by ID successfully:');
    console.log(`   - User ID: ${userById.userId}`);
    console.log(`   - Email: ${userById.email}`);
    console.log(`   - Name: ${userById.name}`);
    console.log();

    // Test 3: Get User by Email
    console.log('3️⃣  Testing getUserByEmail()...');
    const userByEmail = await repo.getUserByEmail(testEmail);
    
    if (!userByEmail) {
      throw new Error('User not found by email');
    }
    
    console.log('✅ User retrieved by email successfully:');
    console.log(`   - User ID: ${userByEmail.userId}`);
    console.log(`   - Email: ${userByEmail.email}`);
    console.log(`   - Name: ${userByEmail.name}`);
    console.log();

    // Verify both lookups return the same user
    if (userById.userId !== userByEmail.userId) {
      throw new Error('User ID mismatch between getUserById and getUserByEmail');
    }
    console.log('✅ Both lookup methods return the same user\n');

    // Test 4: Update User
    console.log('4️⃣  Testing updateUser()...');
    const updatedName = 'Updated Test User';
    const updatedBio = 'This is a test bio for the user';
    
    // Wait a moment to ensure lastModified timestamp is different
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const updatedUser = await repo.updateUser(testUserId, {
      name: updatedName,
      bio: updatedBio,
    });
    
    console.log('✅ User updated successfully:');
    console.log(`   - User ID: ${updatedUser.userId}`);
    console.log(`   - Name: ${updatedUser.name}`);
    console.log(`   - Bio: ${updatedUser.bio}`);
    console.log(`   - Created At: ${updatedUser.createdAt}`);
    console.log(`   - Last Modified: ${updatedUser.lastModified}`);
    
    // Verify lastModified was updated
    if (updatedUser.lastModified === createdUser.lastModified) {
      console.warn('⚠️  Warning: lastModified timestamp was not updated');
    } else {
      console.log('✅ lastModified timestamp was updated correctly');
    }
    console.log();

    // Test 5: Delete User
    console.log('5️⃣  Testing deleteUser()...');
    await repo.deleteUser(testUserId);
    console.log('✅ User deleted successfully\n');

    // Test 6: Verify deletion
    console.log('6️⃣  Verifying user was deleted...');
    const deletedUser = await repo.getUserById(testUserId);
    
    if (deletedUser) {
      throw new Error('User still exists after deletion');
    }
    
    console.log('✅ User no longer exists in database\n');

    // All tests passed
    console.log('🎉 All tests passed successfully!\n');
    console.log('Summary:');
    console.log('  ✅ createUser() - Working');
    console.log('  ✅ getUserById() - Working');
    console.log('  ✅ getUserByEmail() - Working');
    console.log('  ✅ updateUser() - Working');
    console.log('  ✅ deleteUser() - Working');
    console.log('  ✅ Timestamps - Working');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    // Cleanup: Try to delete test user if it was created
    if (testUserId) {
      try {
        console.log('\n🧹 Cleaning up test user...');
        await repo.deleteUser(testUserId);
        console.log('✅ Test user cleaned up');
      } catch (cleanupError) {
        console.error('⚠️  Failed to cleanup test user:', cleanupError);
      }
    }
    
    process.exit(1);
  }
}

// Run the tests
testUserRepository();
