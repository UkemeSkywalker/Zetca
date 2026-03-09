/**
 * Diagnostic script to check JWT token generation and expiration
 */

import { generateToken, verifyToken } from '../lib/auth/jwt';
import { getConfig } from '../lib/config';

console.log('=== JWT Token Diagnostic ===\n');

// Check configuration
const config = getConfig();
console.log('1. Configuration:');
console.log(`   JWT Secret: ${config.jwtSecret ? '***' + config.jwtSecret.slice(-4) : '(not set)'}`);
console.log(`   JWT Expiration Hours: ${config.jwtExpirationHours}`);
console.log(`   Expected expiration: ${config.jwtExpirationHours * 60 * 60} seconds (${config.jwtExpirationHours} hours)\n`);

// Generate a test token
const testUserId = 'test-user-123';
const testEmail = 'test@example.com';

console.log('2. Generating test token...');
const token = generateToken(testUserId, testEmail);
console.log(`   Token (first 50 chars): ${token.substring(0, 50)}...\n`);

// Decode and verify the token
console.log('3. Verifying token...');
const decoded = verifyToken(token);

if (decoded) {
  console.log('   ✓ Token is valid');
  console.log(`   User ID: ${decoded.userId}`);
  console.log(`   Email: ${decoded.email}`);
  console.log(`   Issued at (iat): ${decoded.iat} (${new Date(decoded.iat * 1000).toISOString()})`);
  console.log(`   Expires at (exp): ${decoded.exp} (${new Date(decoded.exp * 1000).toISOString()})`);
  
  const now = Math.floor(Date.now() / 1000);
  const timeUntilExpiration = decoded.exp - now;
  const hoursUntilExpiration = timeUntilExpiration / 3600;
  const minutesUntilExpiration = timeUntilExpiration / 60;
  
  console.log(`\n4. Expiration Analysis:`);
  console.log(`   Current time: ${now} (${new Date(now * 1000).toISOString()})`);
  console.log(`   Time until expiration: ${timeUntilExpiration} seconds`);
  console.log(`   Time until expiration: ${minutesUntilExpiration.toFixed(2)} minutes`);
  console.log(`   Time until expiration: ${hoursUntilExpiration.toFixed(2)} hours`);
  
  if (hoursUntilExpiration < 1) {
    console.log(`\n   ⚠️  WARNING: Token expires in less than 1 hour!`);
    console.log(`   This explains why you're being logged out quickly.`);
  } else if (hoursUntilExpiration < 23) {
    console.log(`\n   ⚠️  WARNING: Token expiration is less than expected (${hoursUntilExpiration.toFixed(2)} hours vs 24 hours)`);
  } else {
    console.log(`\n   ✓ Token expiration looks correct (${hoursUntilExpiration.toFixed(2)} hours)`);
  }
} else {
  console.log('   ✗ Token verification failed!');
}

console.log('\n=== End Diagnostic ===');
