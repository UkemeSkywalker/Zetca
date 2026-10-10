/**
 * Zod schemas and types for scheduler data validation and serialization.
 *
 * Field names are snake_case to match the wire format consumed by
 * lib/api/schedulerClient.ts.
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function isValidTime(v: string): boolean {
  if (!TIME_RE.test(v)) return false;
  const [h, m] = v.split(':').map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export const AutoScheduleInputSchema = z.object({
  strategy_id: z.string().trim().min(1, 'strategy_id cannot be empty or whitespace only'),
  /** Which copy set to schedule (a Copywriter job id, or "other"); defaults to the newest set */
  set_id: z.string().trim().min(1).optional(),
  /** The user's IANA timezone, e.g. "Africa/Lagos"; the agent picks times in it */
  timezone: z.string().trim().min(1).optional(),
});
export type AutoScheduleInput = z.infer<typeof AutoScheduleInputSchema>;

export const ManualScheduleInputSchema = z.object({
  copy_id: z.string().trim().min(1).default('manual'),
  scheduled_date: z
    .string()
    .trim()
    .min(1, 'scheduled_date is required')
    .refine(isValidDate, 'scheduled_date must be in YYYY-MM-DD format'),
  scheduled_time: z
    .string()
    .trim()
    .min(1, 'scheduled_time is required')
    .refine(isValidTime, 'scheduled_time must be in HH:MM format'),
  platform: z.string().trim().min(1, 'Field cannot be empty or whitespace only').transform((p) => p.toLowerCase()),
  content: z.string().nullable().optional(),
  media_id: z.string().nullable().optional(),
  media_type: z.string().nullable().optional(),
});
export type ManualScheduleInput = z.infer<typeof ManualScheduleInputSchema>;

export const PostAssignmentSchema = z.object({
  copy_id: z.string().describe('ID of the copy being scheduled'),
  scheduled_date: z.string().describe('ISO 8601 date string'),
  scheduled_time: z.string().describe('Time in HH:MM format'),
  platform: z.string().describe('Target platform'),
});
export type PostAssignment = z.infer<typeof PostAssignmentSchema>;

export const AutoScheduleOutputSchema = z.object({
  posts: z
    .array(PostAssignmentSchema)
    .min(1)
    .describe('List of post assignments with dates, times, and copy references'),
});
export type AutoScheduleOutput = z.infer<typeof AutoScheduleOutputSchema>;

/**
 * draft: not queued. scheduled: waiting to publish. publishing: claimed by a
 * publisher right now. published: done. failed: gave up (see last_error).
 */
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

/** Platforms the publisher can post to automatically */
export const AUTO_PUBLISH_PLATFORMS = new Set(['linkedin']);

/** The UTC instant a post is due, as an ISO string ("" if its date or time is invalid) */
export function dueAtOf(scheduledDate: string, scheduledTime: string): string {
  const d = new Date(`${scheduledDate}T${scheduledTime}:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export interface ScheduledPostRecord {
  id: string;
  strategy_id: string;
  copy_id: string;
  user_id: string;
  content: string;
  platform: string;
  hashtags: string[];
  scheduled_date: string;
  scheduled_time: string;
  status: PostStatus;
  strategy_color: string;
  strategy_label: string;
  created_at: string;
  media_id?: string | null;
  media_type?: string | null;
  /** When the post is due (UTC ISO), kept in step with scheduled_date/time for the due-posts index */
  due_at?: string;
  /** Automatic publish attempts so far */
  publish_attempts?: number;
  /** Don't retry before this time (UTC ISO), after a failed attempt */
  next_attempt_at?: string | null;
  /** When a publisher claimed the post (status "publishing") */
  claimed_at?: string | null;
  published_at?: string | null;
  last_error_code?: string | null;
  last_error?: string | null;
  updated_at: string;
}

export function newScheduledPostRecord(
  data: Partial<ScheduledPostRecord> & {
    strategy_id: string;
    copy_id: string;
    user_id: string;
    content: string;
    platform: string;
  }
): ScheduledPostRecord {
  const now = new Date().toISOString();
  const record: ScheduledPostRecord = {
    id: randomUUID(),
    hashtags: [],
    scheduled_date: '',
    scheduled_time: '',
    status: 'draft',
    strategy_color: '',
    strategy_label: '',
    publish_attempts: 0,
    created_at: now,
    updated_at: now,
    ...data,
  };
  return { ...record, due_at: dueAtOf(record.scheduled_date, record.scheduled_time) };
}

export const ScheduledPostUpdateSchema = z.object({
  scheduled_date: z.string().refine(isValidDate, 'scheduled_date must be in YYYY-MM-DD format').optional(),
  scheduled_time: z.string().refine(isValidTime, 'scheduled_time must be in HH:MM format').optional(),
  content: z.string().optional(),
  platform: z.string().trim().min(1).transform((p) => p.toLowerCase()).optional(),
  hashtags: z.array(z.string()).optional(),
  // "publishing" and "failed" are set by the publisher only
  status: z.enum(['draft', 'scheduled', 'published']).optional(),
  media_id: z.string().nullable().optional(),
  media_type: z.string().nullable().optional(),
});
export type ScheduledPostUpdate = z.infer<typeof ScheduledPostUpdateSchema>;
