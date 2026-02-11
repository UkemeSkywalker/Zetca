/**
 * Application configuration
 * Loads environment variables and provides typed configuration object
 */

interface Config {
  dynamoDbTableName: string;
  awsRegion: string;
  jwtSecret: string;
  jwtExpirationHours: number;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
}

// Use a function to get config so environment variables are read at runtime
export function getConfig(): Config {
  const cfg = {
    dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME || 'users-dev',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpirationHours: 24,
    rateLimitMaxRequests: 5,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
  };

  // Validate required configuration in production
  if (process.env.NODE_ENV === 'production' && !cfg.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return cfg;
}

// Export a default config instance for convenience
export const config: Config = getConfig();
