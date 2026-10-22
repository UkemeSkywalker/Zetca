/**
 * The video details form's state, and how it becomes the request body.
 */

import { VideoDetailsSchema, fieldErrors, type VideoDetailsInput } from '@/lib/models/youtubeVideo';

export interface DetailsDraft {
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  language: string;
  translations: { language: string; title: string; description: string }[];
  thumbnailMediaId?: string;
  playlistIds: string[];
  /** null until the creator answers: YouTube has no default */
  madeForKids: boolean | null;
  paidPromotion: boolean;
  alteredContent: boolean;
  captions?: { key: string; language: string; filename: string };
  recordingDate: string;
  license: 'youtube' | 'creativeCommon';
  embeddable: boolean;
  publicStatsViewable: boolean;
  privacyStatus: 'public' | 'unlisted' | 'private';
  publishMode: 'now' | 'schedule';
  scheduledDate: string;
  scheduledTime: string;
  timeZone: string;
  notifySubscribers: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "my_video-final v2.mp4" → "My video final v2" */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
  return (base.charAt(0).toUpperCase() + base.slice(1)).slice(0, 100);
}

/** A new draft: tomorrow at 18:00 in the browser's time zone */
export function newDraft(filename: string, opts: { language: string; timeZone: string; now?: Date }): DetailsDraft {
  const tomorrow = new Date(opts.now ?? new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    title: titleFromFilename(filename),
    description: '',
    tags: [],
    categoryId: '22', // People & Blogs, YouTube's default
    language: opts.language,
    translations: [],
    playlistIds: [],
    madeForKids: null,
    paidPromotion: false,
    alteredContent: false,
    recordingDate: '',
    license: 'youtube',
    embeddable: true,
    publicStatsViewable: true,
    privacyStatus: 'public',
    publishMode: 'schedule',
    scheduledDate: ymd(tomorrow),
    scheduledTime: '18:00',
    timeZone: opts.timeZone,
    notifySubscribers: true,
  };
}

export function draftToInput(d: DetailsDraft): VideoDetailsInput {
  const scheduled = d.publishMode === 'schedule';
  return {
    title: d.title,
    description: d.description,
    tags: d.tags,
    categoryId: d.categoryId,
    language: d.language || undefined,
    translations: d.translations,
    thumbnailMediaId: d.thumbnailMediaId,
    playlistIds: d.playlistIds,
    // The schema rejects null with "Tell YouTube whether this video is made for kids"
    madeForKids: d.madeForKids as boolean,
    paidPromotion: d.paidPromotion,
    alteredContent: d.alteredContent,
    captions: d.captions,
    recordingDate: d.recordingDate || undefined,
    license: d.license,
    embeddable: d.embeddable,
    publicStatsViewable: d.publicStatsViewable,
    privacyStatus: d.privacyStatus,
    publishMode: d.publishMode,
    scheduledDate: scheduled ? d.scheduledDate : undefined,
    scheduledTime: scheduled ? d.scheduledTime : undefined,
    timeZone: scheduled ? d.timeZone : undefined,
    notifySubscribers: d.notifySubscribers,
  };
}

/** Field path → message for everything the form must fix before scheduling */
export function validateDraft(d: DetailsDraft): Record<string, string> {
  const result = VideoDetailsSchema.safeParse(draftToInput(d));
  return result.success ? {} : fieldErrors(result.error);
}

/** Which form section a field error belongs to, for jumping to it */
export function sectionForField(path: string): string {
  const field = path.split('.')[0];
  if (field === 'thumbnailMediaId') return 'thumbnail';
  if (field === 'playlistIds') return 'playlists';
  if (field === 'madeForKids') return 'audience';
  if (field === 'paidPromotion' || field === 'alteredContent') return 'disclosures';
  if (['captions', 'recordingDate', 'license', 'embeddable', 'publicStatsViewable'].includes(field)) return 'more';
  if (['privacyStatus', 'publishMode', 'scheduledDate', 'scheduledTime', 'timeZone', 'notifySubscribers'].includes(field)) {
    return 'visibility';
  }
  return 'details';
}

/** Saved details back into form state, for editing */
export function draftFromDetails(details: import('@/lib/models/youtubeVideo').VideoDetails, fallbackTimeZone: string): DetailsDraft {
  const base = newDraft('', { language: details.language ?? 'en', timeZone: details.timeZone ?? fallbackTimeZone });
  return {
    ...base,
    title: details.title,
    description: details.description,
    tags: details.tags,
    categoryId: details.categoryId,
    language: details.language ?? base.language,
    translations: details.translations,
    thumbnailMediaId: details.thumbnailMediaId,
    playlistIds: details.playlistIds,
    madeForKids: details.madeForKids,
    paidPromotion: details.paidPromotion,
    alteredContent: details.alteredContent,
    captions: details.captions,
    recordingDate: details.recordingDate ?? '',
    license: details.license,
    embeddable: details.embeddable,
    publicStatsViewable: details.publicStatsViewable,
    privacyStatus: details.privacyStatus,
    publishMode: details.publishMode,
    scheduledDate: details.scheduledDate ?? base.scheduledDate,
    scheduledTime: details.scheduledTime ?? base.scheduledTime,
    timeZone: details.timeZone ?? base.timeZone,
    notifySubscribers: details.notifySubscribers,
  };
}
