/**
 * Debug script to test strategy API authentication
 * Run with: npx tsx scripts/debug-strategy-auth.ts
 */

// Check if token exists in localStorage (simulated)
const token = process.env.TEST_TOKEN || 'your-jwt-token-here';

console.log('=== Strategy API Authentication Debug ===\n');

// Test 1: Check token format
console.log('1. Token Check:');
console.log('Token exists:', !!token);
console.log('Token length:', token.length);
console.log('Token preview:', token.substring(0, 50) + '...');

// Test 2: Decode JWT (without verification)
if (token && token !== 'your-jwt-token-here') {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      console.log('\n2. Token Payload:');
      console.log(JSON.stringify(payload, null, 2));
      
      // Check for userId field
      if (payload.userId) {
        console.log('\n✓ userId found in token:', payload.userId);
      } else {
        console.log('\n✗ ERROR: userId NOT found in token!');
        console.log('Available fields:', Object.keys(payload));
      }
      
      // Check expiration
      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        const now = new Date();
        console.log('\nToken expiration:', expDate.toISOString());
        console.log('Current time:', now.toISOString());
        console.log('Token expired:', now > expDate);
      }
    } else {
      console.log('\n✗ ERROR: Invalid JWT format (should have 3 parts)');
    }
  } catch (error) {
    console.log('\n✗ ERROR decoding token:', error);
  }
}

// Test 3: Make API call
const API_URL = process.env.NEXT_PUBLIC_PYTHON_SERVICE_URL || 'http://localhost:8000';

async function testAPICall() {
  console.log('\n3. Testing API Call:');
  console.log('API URL:', API_URL);
  
  try {
    const response = await fetch(`${API_URL}/api/strategy/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response statusText:', response.statusText);
    
    const data = await response.json();
    console.log('Response body:', JSON.stringify(data, null, 2));
    
    if (response.status === 401) {
      console.log('\n✗ ERROR: 401 Unauthorized - Token is invalid or expired');
    } else if (response.status === 403) {
      console.log('\n✗ ERROR: 403 Forbidden - Access denied');
    } else if (response.ok) {
      console.log('\n✓ SUCCESS: API call succeeded');
    }
  } catch (error) {
    console.log('\n✗ ERROR making API call:', error);
  }
}

if (token && token !== 'your-jwt-token-here') {
  testAPICall();
} else {
  console.log('\n⚠ To test API call, set TEST_TOKEN environment variable');
  console.log('Example: TEST_TOKEN="your-jwt-token" npx tsx scripts/debug-strategy-auth.ts');
}
