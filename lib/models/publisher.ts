/**
 * Types for publish log records and LinkedIn API request/response objects.
 *
 * Field names are snake_case to match the wire format consumed by
 * lib/api/publisherClient.ts.
 */

import { randomUUID } from 'crypto';

export type PublishStatus = 'published' | 'failed' | 'skipped';

export interface PublishLogRecord {
  log_id: string;
  post_id: string;
  user_id: string;
  platform: string;
  status: PublishStatus;
  linkedin_post_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  attempted_at: string;
}

export function newPublishLogRecord(
  data: Partial<PublishLogRecord> & { post_id: string; user_id: string; status: PublishStatus }
): PublishLogRecord {
  return {
    log_id: randomUUID(),
    platform: 'linkedin',
    attempted_at: new Date().toISOString(),
    ...data,
  };
}

export interface LinkedInPostResponse {
  status_code: number;
  post_id?: string | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface LinkedInImageUploadResponse {
  upload_url: string;
  image_urn: string;
}
