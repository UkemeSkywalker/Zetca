/**
 * Test script for Profile API endpoint
 * Tests GET /api/profile with and without authentication
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { UserRepository } from '../lib/db/userRepository';
import { hashPassword } from '../lib/auth/password';
import { generateToken } from '../lib/auth/jwt';

async function testProfileAPI() {
  console.log('🧪 Testing Profile API Endpoint\n');

  try {
    // Step 1: Create a test user
    console.log('1️⃣  Creating test user...');
    const userRepo = new UserRepository();
    const testEmail = `test-profile-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testName = 'Profile Test User';
    
    const passwordHash = await hashPassword(testPassword);
    const user = await userRepo.createUser(testEmail, passwordHash, testName);
    console.log(`✅ User created: ${user.userId}`);

    // Step 2: Generate JWT token for the user
    console.log('\n2️⃣  Generating JWT token...');
    const token = generateToken(user.userId, user.email);
    console.log(`✅ Token generated: ${token.substring(0, 20)}...`);

    // Step 3: Test GET /api/profile WITH valid token
    console.log('\n3️⃣  Testing GET /api/profile WITH authentication...');
    const authenticatedResponse = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: {
        'Cookie': `auth_token=${token}`,
      },
    });

    if (!authenticatedResponse.ok) {
      console.log(`❌ Request failed with status: ${authenticatedResponse.status}`);
      const errorData = await authenticatedResponse.json();
      console.log('Error:', errorData);
    } else {
      const data = await authenticatedResponse.json();
      console.log('✅ Profile retrieved successfully:');
      console.log('   Response:', JSON.stringify(data, null, 2));
      
      // Verify response structure
      if (data.success && data.user) {
        console.log('✅ Response has correct structure');
        console.log(`   User ID: ${data.user.id}`);
        console.log(`   Email: ${data.user.email}`);
        console.log(`   Name: ${data.user.name}`);
        
        // Verify password hash is NOT included
        if (!('passwordHash' in data.user)) {
          console.log('✅ Password hash correctly excluded from response');
        } else {
          console.log('❌ WARNING: Password hash exposed in response!');
        }
      } else {
        console.log('❌ Response structure is incorrect');
      }
    }

    // Step 4: Test GET /api/profile WITHOUT token (should fail with 401)
    console.log('\n4️⃣  Testing GET /api/profile WITHOUT authentication...');
    const unauthenticatedResponse = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
    });

    if (unauthenticatedResponse.status === 401) {
      const errorData = await unauthenticatedResponse.json();
      console.log('✅ Correctly rejected with 401 Unauthorized');
      console.log('   Error:', errorData.error);
    } else {
      console.log(`❌ Expected 401, got ${unauthenticatedResponse.status}`);
    }

    // Step 5: Test with invalid token
    console.log('\n5️⃣  Testing GET /api/profile with INVALID token...');
    const invalidTokenResponse = await fetch('http://localhost:3000/api/profile', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=invalid.token.here',
      },
    });

    if (invalidTokenResponse.status === 401) {
      const errorData = await invalidTokenResponse.json();
      console.log('✅ Correctly rejected invalid token with 401');
      console.log('   Error:', errorData.error);
    } else {
      console.log(`❌ Expected 401, got ${invalidTokenResponse.status}`);
    }

    // Cleanup: Delete test user
    console.log('\n6️⃣  Cleaning up test user...');
    await userRepo.deleteUser(user.userId);
    console.log('✅ Test user deleted');

    console.log('\n✅ All Profile API tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  }
}

// Run tests
testProfileAPI();
