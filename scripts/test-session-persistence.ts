/**
 * Test script for session persistence and token expiration
 * This script tests the JWT token expiration logic
 */

import { generateToken, verifyToken } from '../lib/auth/jwt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testSessionPersistence() {
  console.log('=== Testing Session Persistence and Token Expiration ===\n');

  // Test 1: Generate a token and verify it's valid
  console.log('Test 1: Generate and verify valid token');
  const userId = 'test-user-123';
  const email = 'test@example.com';
  const token = generateToken(userId, email);
  console.log('✓ Token generated:', token.substring(0, 50) + '...');

  const decoded = verifyToken(token);
  if (decoded && decoded.userId === userId && decoded.email === email) {
    console.log('✓ Token verified successfully');
    console.log('  - User ID:', decoded.userId);
    console.log('  - Email:', decoded.email);
    console.log('  - Issued at:', new Date(decoded.iat * 1000).toISOString());
    console.log('  - Expires at:', new Date(decoded.exp * 1000).toISOString());
    
    // Calculate time until expiration
    const now = Date.now();
    const expiresIn = decoded.exp * 1000 - now;
    const hoursUntilExpiration = expiresIn / (1000 * 60 * 60);
    console.log('  - Hours until expiration:', hoursUntilExpiration.toFixed(2));
  } else {
    console.log('✗ Token verification failed');
  }

  console.log('\nTest 2: Generate token with short expiration (for testing)');
  // Generate a token that expires in 5 seconds
  const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
  const shortLivedToken = jwt.sign(
    { userId, email },
    jwtSecret,
    { expiresIn: '5s' }
  );
  console.log('✓ Short-lived token generated (expires in 5 seconds)');

  const shortDecoded = verifyToken(shortLivedToken);
  if (shortDecoded) {
    console.log('✓ Short-lived token verified');
    console.log('  - Expires at:', new Date(shortDecoded.exp * 1000).toISOString());
  }

  console.log('\nTest 3: Wait for token to expire...');
  await new Promise(resolve => setTimeout(resolve, 6000));
  
  const expiredDecoded = verifyToken(shortLivedToken);
  if (expiredDecoded === null) {
    console.log('✓ Expired token correctly rejected');
  } else {
    console.log('✗ Expired token was not rejected (this should not happen)');
  }

  console.log('\nTest 4: Test token expiration calculation');
  const testToken = generateToken('user-456', 'user@example.com');
  const testDecoded = verifyToken(testToken);
  if (testDecoded) {
    const expirationTime = testDecoded.exp * 1000;
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    const isExpiringSoon = expirationTime - currentTime < fiveMinutes;
    console.log('✓ Token expiration check:');
    console.log('  - Current time:', new Date(currentTime).toISOString());
    console.log('  - Expiration time:', new Date(expirationTime).toISOString());
    console.log('  - Is expiring soon (< 5 min):', isExpiringSoon);
    console.log('  - Time until expiration:', ((expirationTime - currentTime) / 1000 / 60).toFixed(2), 'minutes');
  }

  console.log('\n=== All Tests Completed ===');
}

// Run tests
testSessionPersistence().catch(console.error);
