/**
 * Application configuration
 * Loads environment variables and provides typed configuration object
 */

interface Config {
  dynamoDbTableName: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  jwtSecret: string;
  jwtExpirationHours: number;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  linkedinClientId: string;
  linkedinClientSecret: string;
  linkedinRedirectUri: string;
  s3MediaBucket: string;
  dynamoDbMediaTableName: string;
}

// Use a function to get config so environment variables are read at runtime
export function getConfig(): Config {
  const cfg = {
    dynamoDbTableName: process.env.DYNAMODB_TABLE_NAME || 'users-dev',
    awsRegion: process.env.AWS_REGION || 'us-east-1',
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpirationHours: 24,
    rateLimitMaxRequests: 5,
    rateLimitWindowMs: 15 * 60 * 1000, // 15 minutes
    linkedinClientId: process.env.LINKEDIN_CLIENT_ID || '',
    linkedinClientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    linkedinRedirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:3000/api/auth/linkedin/callback',
    s3MediaBucket: process.env.S3_MEDIA_BUCKET || 'zetca-post-media-dev',
    dynamoDbMediaTableName: process.env.DYNAMODB_MEDIA_TABLE_NAME || 'post-media-dev',
  };

  // Validate required configuration in production
  if (process.env.NODE_ENV === 'production' && !cfg.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return cfg;
}

// Export a default config instance for convenience
export const config: Config = getConfig();
