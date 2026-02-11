/**
 * Test script for login API endpoint
 * 
 * This script tests:
 * 1. Successful login with valid credentials
 * 2. Failed login with invalid credentials
 * 3. Rate limiting (6+ rapid requests)
 * 
 * Prerequisites:
 * - DynamoDB table must exist
 * - A test user must be created (use signup endpoint or test-db.ts)
 * - Next.js dev server must be running
 */

const BASE_URL = 'http://localhost:3000';

interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
}

async function testLogin(email: string, password: string): Promise<void> {
  console.log(`\n🔐 Testing login with email: ${email}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data: LoginResponse = await response.json();
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    // Check for auth-token cookie
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      console.log('✅ Cookie set:', cookies.includes('auth-token') ? 'Yes' : 'No');
    } else {
      console.log('❌ No cookie set');
    }
    
    if (response.ok && data.success) {
      console.log('✅ Login successful');
      console.log(`   Token: ${data.token?.substring(0, 20)}...`);
      console.log(`   User: ${data.user?.name} (${data.user?.email})`);
    } else {
      console.log('❌ Login failed:', data.error);
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
  }
}

async function testRateLimit(email: string, password: string): Promise<void> {
  console.log('\n⏱️  Testing rate limiting (making 7 rapid requests)...');
  
  const requests = [];
  for (let i = 0; i < 7; i++) {
    requests.push(
      fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })
    );
  }
  
  const responses = await Promise.all(requests);
  
  let successCount = 0;
  let rateLimitCount = 0;
  
  for (let i = 0; i < responses.length; i++) {
    const response = responses[i];
    const data = await response.json();
    
    if (response.status === 429) {
      rateLimitCount++;
      const retryAfter = response.headers.get('retry-after');
      console.log(`   Request ${i + 1}: ⛔ Rate limited (429) - Retry after ${retryAfter}s`);
    } else if (response.ok) {
      successCount++;
      console.log(`   Request ${i + 1}: ✅ Success (200)`);
    } else {
      console.log(`   Request ${i + 1}: ❌ Failed (${response.status}): ${data.error}`);
    }
  }
  
  console.log(`\nResults: ${successCount} successful, ${rateLimitCount} rate limited`);
  
  if (rateLimitCount >= 2) {
    console.log('✅ Rate limiting is working correctly');
  } else {
    console.log('❌ Rate limiting may not be working as expected');
  }
}

async function main() {
  console.log('🧪 Login API Endpoint Test Suite');
  console.log('=================================');
  
  // Test credentials - update these with actual test user
  const validEmail = 'test@example.com';
  const validPassword = 'TestPassword123';
  const invalidPassword = 'WrongPassword123';
  
  console.log('\n📝 Test Configuration:');
  console.log(`   Valid Email: ${validEmail}`);
  console.log(`   Valid Password: ${validPassword}`);
  console.log(`   Base URL: ${BASE_URL}`);
  
  // Test 1: Valid credentials
  console.log('\n\n--- Test 1: Valid Credentials ---');
  await testLogin(validEmail, validPassword);
  
  // Test 2: Invalid credentials
  console.log('\n\n--- Test 2: Invalid Credentials ---');
  await testLogin(validEmail, invalidPassword);
  
  // Test 3: Invalid email
  console.log('\n\n--- Test 3: Non-existent Email ---');
  await testLogin('nonexistent@example.com', validPassword);
  
  // Test 4: Rate limiting
  console.log('\n\n--- Test 4: Rate Limiting ---');
  await testRateLimit(validEmail, validPassword);
  
  console.log('\n\n✅ Test suite completed');
  console.log('\n📋 Manual verification steps:');
  console.log('   1. Use Postman/curl to POST to /api/auth/login with valid credentials');
  console.log('   2. Verify token is returned in response body');
  console.log('   3. Verify auth-token cookie is set in response headers');
  console.log('   4. Try invalid credentials and verify generic error message');
  console.log('   5. Make 6+ rapid requests and verify 429 status code');
}

main().catch(console.error);
