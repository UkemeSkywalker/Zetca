/**
 * Test script for comprehensive error handling
 * Tests various error scenarios to verify error handling works correctly
 */

import { AuthError, AuthErrors, logError, formatErrorResponse, isRetryableError } from '../lib/errors';

console.log('=== Testing Error Handling System ===\n');

// Test 1: AuthError class
console.log('Test 1: AuthError class instantiation');
try {
  const error = new AuthError('Test error', 400, 'testField', 'TEST_CODE');
  console.log('✓ AuthError created:', {
    message: error.message,
    statusCode: error.statusCode,
    field: error.field,
    code: error.code,
    name: error.name,
  });
} catch (error) {
  console.error('✗ Failed to create AuthError:', error);
}

// Test 2: Predefined error types
console.log('\nTest 2: Predefined error types');
const errorTypes = [
  { name: 'INVALID_EMAIL', error: AuthErrors.INVALID_EMAIL() },
  { name: 'INVALID_PASSWORD', error: AuthErrors.INVALID_PASSWORD() },
  { name: 'INVALID_CREDENTIALS', error: AuthErrors.INVALID_CREDENTIALS() },
  { name: 'MISSING_TOKEN', error: AuthErrors.MISSING_TOKEN() },
  { name: 'EMAIL_EXISTS', error: AuthErrors.EMAIL_EXISTS() },
  { name: 'RATE_LIMIT_EXCEEDED', error: AuthErrors.RATE_LIMIT_EXCEEDED() },
  { name: 'DATABASE_ERROR', error: AuthErrors.DATABASE_ERROR() },
];

errorTypes.forEach(({ name, error }) => {
  console.log(`✓ ${name}:`, {
    message: error.message,
    statusCode: error.statusCode,
    code: error.code,
  });
});

// Test 3: Error logging
console.log('\nTest 3: Error logging');
try {
  const testError = AuthErrors.INVALID_CREDENTIALS();
  logError(testError, {
    endpoint: '/api/auth/login',
    method: 'POST',
    userId: 'test-user-123',
  });
  console.log('✓ Error logged successfully (check console output above)');
} catch (error) {
  console.error('✗ Failed to log error:', error);
}

// Test 4: Error response formatting
console.log('\nTest 4: Error response formatting');
try {
  const authError = AuthErrors.INVALID_EMAIL('email');
  const formatted = formatErrorResponse(authError);
  console.log('✓ AuthError formatted:', formatted);

  const genericError = new Error('Generic error');
  const formattedGeneric = formatErrorResponse(genericError);
  console.log('✓ Generic error formatted:', formattedGeneric);
} catch (error) {
  console.error('✗ Failed to format error:', error);
}

// Test 5: Retryable error detection
console.log('\nTest 5: Retryable error detection');
const retryableTests = [
  { error: AuthErrors.DATABASE_ERROR(), expected: true },
  { error: AuthErrors.RATE_LIMIT_EXCEEDED(), expected: true },
  { error: AuthErrors.INVALID_CREDENTIALS(), expected: false },
  { error: AuthErrors.INVALID_EMAIL(), expected: false },
];

retryableTests.forEach(({ error, expected }) => {
  const isRetryable = isRetryableError(error);
  const status = isRetryable === expected ? '✓' : '✗';
  console.log(`${status} ${error.code}: retryable=${isRetryable} (expected=${expected})`);
});

// Test 6: Error with missing optional fields
console.log('\nTest 6: Error with missing optional fields');
try {
  const error = new AuthError('Simple error', 500);
  console.log('✓ Error without optional fields:', {
    message: error.message,
    statusCode: error.statusCode,
    field: error.field,
    code: error.code,
  });
} catch (error) {
  console.error('✗ Failed to create simple error:', error);
}

// Test 7: Error stack trace
console.log('\nTest 7: Error stack trace');
try {
  const error = AuthErrors.INVALID_TOKEN();
  console.log('✓ Error has stack trace:', !!error.stack);
  if (error.stack) {
    console.log('  Stack preview:', error.stack.split('\n')[0]);
  }
} catch (error) {
  console.error('✗ Failed to check stack trace:', error);
}

console.log('\n=== All Error Handling Tests Complete ===');
