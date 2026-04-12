/**
 * Test API route to verify configuration loads in Next.js context
 * Access at: http://localhost:3000/api/test-config
 */

import { NextResponse } from 'next/server';
import { getConfig } from '@/lib/config';

export async function GET() {
  const config = getConfig();
  return NextResponse.json({
    success: true,
    config: {
      dynamoDbTableName: config.dynamoDbTableName,
      awsRegion: config.awsRegion,
      jwtSecretSet: !!config.jwtSecret,
      jwtExpirationHours: config.jwtExpirationHours,
      rateLimitMaxRequests: config.rateLimitMaxRequests,
      rateLimitWindowMs: config.rateLimitWindowMs,
    },
  });
}
