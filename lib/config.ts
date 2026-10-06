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
  dynamoDbScheduledPostsTableName: string;
  dynamoDbStrategiesTableName: string;
  dynamoDbCopiesTableName: string;
  dynamoDbPublishLogTableName: string;
  bedrockModelId: string;
  useMockAgent: boolean;
  agentTimeoutSeconds: number;
  publisherEnabled: boolean;
  publisherScanIntervalSeconds: number;
  linkedinApiTimeoutSeconds: number;
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
    s3MediaBucket: process.env.S3_MEDIA_BUCKET || 'zetca-post-media-dev-831981619011',
    dynamoDbMediaTableName: process.env.DYNAMODB_MEDIA_TABLE_NAME || 'post-media-dev',
    dynamoDbScheduledPostsTableName: process.env.DYNAMODB_SCHEDULED_POSTS_TABLE_NAME || 'scheduled-posts-dev',
    dynamoDbStrategiesTableName: process.env.DYNAMODB_STRATEGIES_TABLE_NAME || 'strategies-dev',
    dynamoDbCopiesTableName: process.env.DYNAMODB_COPIES_TABLE_NAME || 'copies-dev',
    dynamoDbPublishLogTableName: process.env.DYNAMODB_PUBLISH_LOG_TABLE_NAME || 'publish-log-dev',
    bedrockModelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6',
    useMockAgent: process.env.USE_MOCK_AGENT === 'true',
    agentTimeoutSeconds: Number(process.env.AGENT_TIMEOUT_SECONDS || 60),
    publisherEnabled: process.env.PUBLISHER_ENABLED !== 'false',
    publisherScanIntervalSeconds: Number(process.env.PUBLISHER_SCAN_INTERVAL_SECONDS || 60),
    linkedinApiTimeoutSeconds: Number(process.env.LINKEDIN_API_TIMEOUT_SECONDS || 30),
  };

  return cfg;
}
