/**
 * YouTube video details: what people fill in on the "New YouTube video" page.
 *
 * The same schema checks the form in the browser and the request on the
 * server, using YouTube's own limits so the upload doesn't fail later.
 */

import { z } from 'zod';

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX_BYTES = 5000;
export const TAGS_MAX_CHARS = 500;
export const MAX_TRANSLATIONS = 20;
/** Scheduled videos need time to upload to YouTube first */
export const MIN_SCHEDULE_LEAD_MINUTES = 15;

const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

/**
 * How YouTube counts the tag limit: the tags joined with commas, with quotes
 * around tags that contain a space.
 */
export function tagsLength(tags: string[]): number {
  if (tags.length === 0) return 0;
  return tags.reduce((sum, t) => sum + t.length + (t.includes(' ') ? 2 : 0), 0) + (tags.length - 1);
}

const noAngleBrackets = (s: string) => !/[<>]/.test(s);

const title = z
  .string()
  .trim()
  .min(1, 'Add a title')
  .max(TITLE_MAX, `Titles can be up to ${TITLE_MAX} characters`)
  .refine(noAngleBrackets, 'YouTube doesn’t allow < or > in titles');

const description = z
  .string()
  .refine((s) => utf8Bytes(s) <= DESCRIPTION_MAX_BYTES, 'Descriptions can be up to 5,000 characters')
  .refine(noAngleBrackets, 'YouTube doesn’t allow < or > in descriptions');

/** Language codes YouTube accepts, e.g. "en", "pt-BR" */
const languageCode = z.string().regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/, 'Pick a language');

export const VideoDetailsSchema = z
  .object({
    title,
    description: description.default(''),
    tags: z
      .array(z.string().trim().min(1).max(100).refine((t) => !/[<>,]/.test(t), 'Tags can’t contain <, > or commas'))
      .max(100)
      .default([])
      .refine((tags) => tagsLength(tags) <= TAGS_MAX_CHARS, `Tags can be up to ${TAGS_MAX_CHARS} characters in total`),
    categoryId: z.string().regex(/^\d{1,3}$/, 'Pick a category'),
    language: languageCode.optional(),
    translations: z
      .array(z.object({ language: languageCode, title, description: description.default('') }))
      .max(MAX_TRANSLATIONS)
      .default([])
      .refine((list) => new Set(list.map((t) => t.language)).size === list.length, 'Each language can only be added once'),

    thumbnailMediaId: z.string().uuid().optional(),
    playlistIds: z.array(z.string().regex(/^[\w-]{10,64}$/)).max(20).default([]),

    // Required by YouTube: there's no default answer
    madeForKids: z.boolean({ error: 'Tell YouTube whether this video is made for kids' }),
    paidPromotion: z.boolean().default(false),
    alteredContent: z.boolean().default(false),

    captions: z
      .object({ key: z.string().min(1).max(300), language: languageCode, filename: z.string().max(200) })
      .optional(),
    recordingDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    license: z.enum(['youtube', 'creativeCommon']).default('youtube'),
    embeddable: z.boolean().default(true),
    publicStatsViewable: z.boolean().default(true),

    privacyStatus: z.enum(['public', 'unlisted', 'private']).default('public'),
    publishMode: z.enum(['now', 'schedule']).default('schedule'),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    timeZone: z.string().min(1).max(64).optional(),
    notifySubscribers: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.publishMode !== 'schedule') return;
    // YouTube can only schedule a video that goes public
    if (d.privacyStatus !== 'public') {
      ctx.addIssue({ code: 'custom', path: ['publishMode'], message: 'Only public videos can be scheduled' });
    }
    if (!d.scheduledDate) ctx.addIssue({ code: 'custom', path: ['scheduledDate'], message: 'Pick a date' });
    if (!d.scheduledTime) ctx.addIssue({ code: 'custom', path: ['scheduledTime'], message: 'Pick a time' });
    if (!d.timeZone) ctx.addIssue({ code: 'custom', path: ['timeZone'], message: 'Pick a time zone' });
  });

export type VideoDetailsInput = z.input<typeof VideoDetailsSchema>;
export type VideoDetails = z.output<typeof VideoDetailsSchema>;

export const CreateYouTubeVideoSchema = z.object({
  mediaId: z.string().uuid(),
  details: VideoDetailsSchema,
});

/** Where a video is on its way to YouTube */
export type YouTubeVideoStatus =
  | 'queued' // saved; waiting for Zetca to upload it to YouTube
  | 'uploading'
  | 'waiting_quota' // YouTube's daily upload limit was reached; retried tomorrow
  | 'scheduled' // on YouTube as private, goes public at publishAt
  | 'published'
  | 'failed';

export interface YouTubeVideoRecord {
  videoId: string;
  userId: string;
  mediaId: string;
  channelId: string;
  status: YouTubeVideoStatus;
  details: VideoDetails;
  /** UTC ISO time YouTube makes it public; absent for "publish now" */
  publishAt?: string;
  isShort: boolean;
  youtubeVideoId?: string;
  error?: { code: string; message: string };
  /** Things that didn't work but didn't stop the upload, e.g. a thumbnail on an unverified channel */
  warnings?: string[];
  /** Upload attempts so far, and when the next may start (after a failure or the daily limit) */
  attempts?: number;
  nextAttemptAt?: string;
  /** Set while a worker is uploading; refreshed as each piece goes up */
  heartbeatAt?: string;
  /** YouTube's resumable upload session, so an interrupted upload continues where it stopped */
  uploadSessionUri?: string;
  uploadedBytes?: number;
  totalBytes?: number;
  /** When it went up on YouTube */
  uploadedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** A video as the browser sees it: without the upload session, which works like a key to the upload */
export type PublicYouTubeVideo = Omit<YouTubeVideoRecord, 'uploadSessionUri' | 'heartbeatAt'>;

export function toPublicVideo(record: YouTubeVideoRecord): PublicYouTubeVideo {
  const { uploadSessionUri: _session, heartbeatAt: _heartbeat, ...rest } = record;
  void _session;
  void _heartbeat;
  return rest;
}

/** Field path → first error message, for showing errors next to fields */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
