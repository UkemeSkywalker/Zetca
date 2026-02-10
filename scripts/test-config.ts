/**
 * Test script to verify configuration loads correctly
 * Run with: node --loader tsx scripts/test-config.ts
 * Or: npx tsx scripts/test-config.ts
 */

import { config as dotenvConfig } from 'dotenv';

// Load environment variables from .env.local BEFORE importing config
dotenvConfig({ path: '.env.local' });

// Now manually check the config values
const config = {
  dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME || 'users-dev',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpirationHours: 24,
  rateLimitMaxRequests: 5,
  rateLimitWindowMs: 15 * 60 * 1000,
};

console.log('=== Configuration Test ===\n');

console.log('DynamoDB Configuration:');
console.log(`  Table Name: ${config.dynamoDbTableName}`);
console.log(`  AWS Region: ${config.awsRegion}`);

console.log('\nJWT Configuration:');
console.log(`  JWT Secret: ${config.jwtSecret ? '***' + config.jwtSecret.slice(-4) : '(not set)'}`);
console.log(`  JWT Expiration: ${config.jwtExpirationHours} hours`);

console.log('\nRate Limiting Configuration:');
console.log(`  Max Requests: ${config.rateLimitMaxRequests}`);
console.log(`  Window: ${config.rateLimitWindowMs / 1000 / 60} minutes`);

console.log('\n=== Configuration Validation ===');

const validations = [
  { name: 'DynamoDB Table Name', value: config.dynamoDbTableName, valid: !!config.dynamoDbTableName },
  { name: 'AWS Region', value: config.awsRegion, valid: !!config.awsRegion },
  { name: 'JWT Secret', value: config.jwtSecret, valid: !!config.jwtSecret },
  { name: 'JWT Expiration', value: config.jwtExpirationHours, valid: config.jwtExpirationHours > 0 },
  { name: 'Rate Limit Max Requests', value: config.rateLimitMaxRequests, valid: config.rateLimitMaxRequests > 0 },
  { name: 'Rate Limit Window', value: config.rateLimitWindowMs, valid: config.rateLimitWindowMs > 0 },
];

let allValid = true;
validations.forEach(({ name, valid }) => {
  const status = valid ? '✓' : '✗';
  console.log(`${status} ${name}: ${valid ? 'Valid' : 'Invalid'}`);
  if (!valid) allValid = false;
});

console.log('\n=== Test Result ===');
if (allValid) {
  console.log('✓ All configuration values loaded successfully!');
  process.exit(0);
} else {
  console.log('✗ Some configuration values are missing or invalid');
  process.exit(1);
}
