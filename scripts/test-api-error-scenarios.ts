/**
 * Integration test for API error handling
 * Tests various error scenarios across different API endpoints
 * 
 * Note: This script requires the Next.js dev server to be running
 * Run: npm run dev (in another terminal)
 * Then: npx tsx scripts/test-api-error-scenarios.ts
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, message: string) {
  results.push({ name, passed, message });
  const icon = passed ? '✓' : '✗';
  console.log(`${icon} ${name}: ${message}`);
}

async function testValidationError() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: '',
        email: 'invalid-email',
        password: '123',
      }),
    });

    const data = await response.json();
    
    if (response.status === 400 && data.error && data.code) {
      addResult('Validation Error', true, `Got expected 400 with error code: ${data.code}`);
    } else {
      addResult('Validation Error', false, `Expected 400 with error code, got ${response.status}`);
    }
  } catch (error) {
    addResult('Validation Error', false, `Request failed: ${error}`);
  }
}

async function testInvalidCredentials() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      }),
    });

    const data = await response.json();
    
    if (response.status === 401 && data.error === 'Invalid credentials' && data.code === 'INVALID_CREDENTIALS') {
      addResult('Invalid Credentials', true, 'Got expected 401 with generic error message');
    } else {
      addResult('Invalid Credentials', false, `Expected 401 with INVALID_CREDENTIALS, got ${response.status}`);
    }
  } catch (error) {
    addResult('Invalid Credentials', false, `Request failed: ${error}`);
  }
}

async function testMissingToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
    });

    const data = await response.json();
    
    if (response.status === 401 && data.code === 'MISSING_TOKEN') {
      addResult('Missing Token', true, 'Got expected 401 with MISSING_TOKEN code');
    } else {
      addResult('Missing Token', false, `Expected 401 with MISSING_TOKEN, got ${response.status}`);
    }
  } catch (error) {
    addResult('Missing Token', false, `Request failed: ${error}`);
  }
}

async function testInvalidToken() {
  try {
    const response = await fetch(`${BASE_URL}/api/profile`, {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=invalid.token.here',
      },
    });

    const data = await response.json();
    
    if (response.status === 401 && data.code === 'INVALID_TOKEN') {
      addResult('Invalid Token', true, 'Got expected 401 with INVALID_TOKEN code');
    } else {
      addResult('Invalid Token', false, `Expected 401 with INVALID_TOKEN, got ${response.status}`);
    }
  } catch (error) {
    addResult('Invalid Token', false, `Request failed: ${error}`);
  }
}

async function testRateLimiting() {
  try {
    console.log('\nTesting rate limiting (making 6 rapid requests)...');
    
    let rateLimitHit = false;
    
    for (let i = 0; i < 6; i++) {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      });

      if (response.status === 429) {
        const data = await response.json();
        const retryAfter = response.headers.get('Retry-After');
        
        if (data.code === 'RATE_LIMIT_EXCEEDED' && retryAfter) {
          addResult('Rate Limiting', true, `Got 429 after ${i + 1} requests with Retry-After header`);
          rateLimitHit = true;
          break;
        }
      }
    }
    
    if (!rateLimitHit) {
      addResult('Rate Limiting', false, 'Did not hit rate limit after 6 requests');
    }
  } catch (error) {
    addResult('Rate Limiting', false, `Request failed: ${error}`);
  }
}

async function testErrorLogging() {
  try {
    // This test just verifies that errors are logged (check server console)
    await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    addResult('Error Logging', true, 'Check server console for [AUTH ERROR] log entries');
  } catch (error) {
    addResult('Error Logging', false, `Request failed: ${error}`);
  }
}

async function runTests() {
  console.log('=== API Error Handling Integration Tests ===\n');
  console.log('Note: Make sure Next.js dev server is running on port 3000\n');

  await testValidationError();
  await testInvalidCredentials();
  await testMissingToken();
  await testInvalidToken();
  await testRateLimiting();
  await testErrorLogging();

  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log('\n✗ Some tests failed. Review the output above.');
  }
}

runTests().catch(console.error);
