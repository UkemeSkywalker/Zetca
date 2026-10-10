/**
 * TypeScript types for Scheduler Agent Backend
 * These types match the Pydantic models in the Python service
 */

/**
 * Complete scheduled post record stored in database
 */
export interface ScheduledPost {
  id: string;
  strategyId: string;
  copyId: string;
  userId: string;
  content: string;
  platform: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: PostStatus;
  strategyColor: string;
  strategyLabel: string;
  createdAt: string;
  updatedAt: string;
  mediaId?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  /** Automatic publish attempts so far */
  publishAttempts?: number;
  /** Why the last publish attempt failed, in words the user can act on */
  lastError?: string;
  lastErrorCode?: string;
  /** When the publisher will try again, after a failed attempt */
  nextAttemptAt?: string;
}

/**
 * draft: not queued. scheduled: waiting to publish. publishing: being posted now.
 * published: done. failed: gave up (see lastError).
 */
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

/** Platforms the publisher posts to automatically; others must be posted by hand */
export const AUTO_PUBLISH_PLATFORMS = ['linkedin'];

/**
 * Input for manually scheduling a single post
 */
export interface ManualScheduleInput {
  copyId: string;
  scheduledDate: string;
  scheduledTime: string;
  platform: string;
  content?: string;
  mediaId?: string;
  mediaType?: 'image' | 'video';
}

/**
 * Input for updating an existing scheduled post
 */
export interface ScheduledPostUpdate {
  scheduledDate?: string;
  scheduledTime?: string;
  content?: string;
  platform?: string;
  hashtags?: string[];
  status?: 'draft' | 'scheduled' | 'published';
  mediaId?: string | null;
  mediaType?: 'image' | 'video' | null;
}
