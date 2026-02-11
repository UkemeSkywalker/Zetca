/**
 * Test script for authentication utilities
 * Run with: npx tsx scripts/test-auth-utils.ts
 */

// Load environment variables from .env.local FIRST
import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
dotenvConfig({ path: resolve(process.cwd(), '.env.local') });

// Now import modules that depend on environment variables
import { hashPassword, verifyPassword } from '../lib/auth/password';
import { generateToken, verifyToken } from '../lib/auth/jwt';
import {
  validateEmail,
  validatePassword,
  validateName,
  validateBio,
  sanitizeInput,
  validateAndSanitizeEmail,
  validateAndSanitizeName,
  validateAndSanitizeBio,
} from '../lib/validation';

// Verify JWT_SECRET is loaded
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET not found in environment variables');
  console.error('Make sure .env.local exists and contains JWT_SECRET');
  process.exit(1);
}

async function testPasswordHashing() {
  console.log('\n=== Testing Password Hashing ===');
  
  const password = 'mySecurePassword123';
  console.log(`Original password: ${password}`);
  
  // Hash the password
  const hash = await hashPassword(password);
  console.log(`Hashed password: ${hash}`);
  console.log(`✓ Password hashed successfully`);
  
  // Verify correct password
  const isValid = await verifyPassword(password, hash);
  console.log(`Verify correct password: ${isValid}`);
  if (isValid) {
    console.log(`✓ Password verification successful`);
  } else {
    console.error(`✗ Password verification failed`);
  }
  
  // Verify incorrect password
  const isInvalid = await verifyPassword('wrongPassword', hash);
  console.log(`Verify incorrect password: ${isInvalid}`);
  if (!isInvalid) {
    console.log(`✓ Incorrect password correctly rejected`);
  } else {
    console.error(`✗ Incorrect password incorrectly accepted`);
  }
}

function testJWTTokens() {
  console.log('\n=== Testing JWT Tokens ===');
  
  const userId = 'user-123';
  const email = 'test@example.com';
  
  // Generate token
  const token = generateToken(userId, email);
  console.log(`Generated token: ${token.substring(0, 50)}...`);
  console.log(`✓ Token generated successfully`);
  
  // Verify token
  const payload = verifyToken(token);
  if (payload) {
    console.log(`Decoded payload:`, payload);
    console.log(`  userId: ${payload.userId}`);
    console.log(`  email: ${payload.email}`);
    console.log(`  issued at: ${new Date(payload.iat * 1000).toISOString()}`);
    console.log(`  expires at: ${new Date(payload.exp * 1000).toISOString()}`);
    
    // Verify expiration is 24 hours from now
    const expirationHours = (payload.exp - payload.iat) / 3600;
    console.log(`  expiration duration: ${expirationHours} hours`);
    
    if (payload.userId === userId && payload.email === email) {
      console.log(`✓ Token verification successful`);
    } else {
      console.error(`✗ Token payload mismatch`);
    }
    
    if (Math.abs(expirationHours - 24) < 0.01) {
      console.log(`✓ Token expiration set to 24 hours`);
    } else {
      console.error(`✗ Token expiration not set to 24 hours`);
    }
  } else {
    console.error(`✗ Token verification failed`);
  }
  
  // Test invalid token
  const invalidPayload = verifyToken('invalid.token.here');
  if (invalidPayload === null) {
    console.log(`✓ Invalid token correctly rejected`);
  } else {
    console.error(`✗ Invalid token incorrectly accepted`);
  }
}

function testValidation() {
  console.log('\n=== Testing Input Validation ===');
  
  // Test email validation
  console.log('\nEmail validation:');
  const validEmail = validateEmail('test@example.com');
  console.log(`  Valid email: ${validEmail.isValid ? '✓' : '✗'}`);
  
  const invalidEmail = validateEmail('invalid-email');
  console.log(`  Invalid email: ${!invalidEmail.isValid ? '✓' : '✗'} (${invalidEmail.error})`);
  
  const emptyEmail = validateEmail('');
  console.log(`  Empty email: ${!emptyEmail.isValid ? '✓' : '✗'} (${emptyEmail.error})`);
  
  // Test password validation
  console.log('\nPassword validation:');
  const validPassword = validatePassword('password123');
  console.log(`  Valid password: ${validPassword.isValid ? '✓' : '✗'}`);
  
  const shortPassword = validatePassword('short');
  console.log(`  Short password: ${!shortPassword.isValid ? '✓' : '✗'} (${shortPassword.error})`);
  
  const emptyPassword = validatePassword('');
  console.log(`  Empty password: ${!emptyPassword.isValid ? '✓' : '✗'} (${emptyPassword.error})`);
  
  // Test name validation
  console.log('\nName validation:');
  const validName = validateName('John Doe');
  console.log(`  Valid name: ${validName.isValid ? '✓' : '✗'}`);
  
  const emptyName = validateName('');
  console.log(`  Empty name: ${!emptyName.isValid ? '✓' : '✗'} (${emptyName.error})`);
  
  const longName = validateName('a'.repeat(101));
  console.log(`  Long name: ${!longName.isValid ? '✓' : '✗'} (${longName.error})`);
  
  // Test bio validation
  console.log('\nBio validation:');
  const validBio = validateBio('This is my bio');
  console.log(`  Valid bio: ${validBio.isValid ? '✓' : '✗'}`);
  
  const emptyBio = validateBio(undefined);
  console.log(`  Empty bio (optional): ${emptyBio.isValid ? '✓' : '✗'}`);
  
  const longBio = validateBio('a'.repeat(501));
  console.log(`  Long bio: ${!longBio.isValid ? '✓' : '✗'} (${longBio.error})`);
}

function testSanitization() {
  console.log('\n=== Testing Input Sanitization ===');
  
  // Test HTML tag removal
  const htmlInput = '<script>alert("xss")</script>Hello';
  const sanitized = sanitizeInput(htmlInput);
  console.log(`  HTML input: ${htmlInput}`);
  console.log(`  Sanitized: ${sanitized}`);
  console.log(`  ${!sanitized.includes('<') && !sanitized.includes('>') ? '✓' : '✗'} HTML tags removed`);
  
  // Test null byte removal
  const nullByteInput = 'Hello\0World';
  const sanitizedNull = sanitizeInput(nullByteInput);
  console.log(`  Null byte input: Hello\\0World`);
  console.log(`  Sanitized: ${sanitizedNull}`);
  console.log(`  ${!sanitizedNull.includes('\0') ? '✓' : '✗'} Null bytes removed`);
  
  // Test whitespace trimming
  const whitespaceInput = '  Hello World  ';
  const sanitizedWhitespace = sanitizeInput(whitespaceInput);
  console.log(`  Whitespace input: "${whitespaceInput}"`);
  console.log(`  Sanitized: "${sanitizedWhitespace}"`);
  console.log(`  ${sanitizedWhitespace === 'Hello World' ? '✓' : '✗'} Whitespace trimmed`);
  
  // Test combined validation and sanitization
  console.log('\nCombined validation and sanitization:');
  const emailResult = validateAndSanitizeEmail('  TEST@EXAMPLE.COM  ');
  console.log(`  Email: ${emailResult.isValid ? '✓' : '✗'} (sanitized: ${emailResult.sanitized})`);
  
  const nameResult = validateAndSanitizeName('  <b>John Doe</b>  ');
  console.log(`  Name: ${nameResult.isValid ? '✓' : '✗'} (sanitized: ${nameResult.sanitized})`);
  
  const bioResult = validateAndSanitizeBio('  My bio with <script>code</script>  ');
  console.log(`  Bio: ${bioResult.isValid ? '✓' : '✗'} (sanitized: ${bioResult.sanitized})`);
}

async function runTests() {
  console.log('========================================');
  console.log('Authentication Utilities Test Suite');
  console.log('========================================');
  
  try {
    await testPasswordHashing();
    testJWTTokens();
    testValidation();
    testSanitization();
    
    console.log('\n========================================');
    console.log('✓ All tests completed successfully!');
    console.log('========================================\n');
  } catch (error) {
    console.error('\n========================================');
    console.error('✗ Test suite failed with error:');
    console.error(error);
    console.error('========================================\n');
    process.exit(1);
  }
}

runTests();
