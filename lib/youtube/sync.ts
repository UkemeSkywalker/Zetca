/**
 * Edits to a video that's already on YouTube.
 *
 * Starts from YouTube's current version and changes only the fields that
 * changed in Zetca, so anything edited in YouTube Studio is kept. YouTube
 * replaces a whole part (snippet, status…) on update, so each changed part
 * is sent complete, built from the current version.
 */

import type { VideoDetails } from '@/lib/models/youtubeVideo';
import type { YouTubeVideoResource } from '@/lib/services/youtubeUploadApi';

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export interface SyncPlan {
  resource: YouTubeVideoResource;
  /** Parts to send; empty when nothing on YouTube's side changed */
  parts: string[];
}

/**
 * @param publishAt  the new publish time, or null to publish now / keep it public
 * @param scheduled  whether YouTube still has the video scheduled (private, not yet published)
 */
export function planYouTubeUpdate(
  current: YouTubeVideoResource,
  before: VideoDetails,
  after: VideoDetails,
  publish: { scheduled: boolean; publishAtBefore?: string; publishAtAfter?: string }
): SyncPlan {
  const parts = new Set<string>();

  const snippet = {
    title: current.snippet?.title ?? before.title,
    description: current.snippet?.description ?? '',
    tags: current.snippet?.tags ?? [],
    categoryId: current.snippet?.categoryId ?? before.categoryId,
    ...(current.snippet?.defaultLanguage ? { defaultLanguage: current.snippet.defaultLanguage } : {}),
    ...(current.snippet?.defaultAudioLanguage ? { defaultAudioLanguage: current.snippet.defaultAudioLanguage } : {}),
  };
  if (!same(before.title, after.title)) snippet.title = after.title;
  if (!same(before.description, after.description)) snippet.description = after.description;
  if (!same(before.tags, after.tags)) snippet.tags = after.tags;
  if (!same(before.categoryId, after.categoryId)) snippet.categoryId = after.categoryId;
  if (!same(before.language, after.language) && after.language) {
    Object.assign(snippet, { defaultLanguage: after.language, defaultAudioLanguage: after.language });
  }
  if (
    ['title', 'description', 'tags', 'categoryId', 'language'].some(
      (k) => !same(before[k as keyof VideoDetails], after[k as keyof VideoDetails])
    )
  ) {
    parts.add('snippet');
  }

  const cs = current.status ?? {};
  const status: NonNullable<YouTubeVideoResource['status']> = {
    privacyStatus: cs.privacyStatus,
    ...(cs.publishAt ? { publishAt: cs.publishAt } : {}),
    license: cs.license,
    embeddable: cs.embeddable,
    publicStatsViewable: cs.publicStatsViewable,
    selfDeclaredMadeForKids: cs.selfDeclaredMadeForKids,
    containsSyntheticMedia: cs.containsSyntheticMedia,
  };
  const statusFields: [keyof VideoDetails, keyof typeof status][] = [
    ['madeForKids', 'selfDeclaredMadeForKids'],
    ['license', 'license'],
    ['embeddable', 'embeddable'],
    ['publicStatsViewable', 'publicStatsViewable'],
    ['alteredContent', 'containsSyntheticMedia'],
  ];
  for (const [ours, theirs] of statusFields) {
    if (!same(before[ours], after[ours])) {
      (status as Record<string, unknown>)[theirs] = after[ours];
      parts.add('status');
    }
  }

  if (publish.scheduled) {
    // Still waiting to go public: the time can move, or it can go out now
    if (publish.publishAtAfter && publish.publishAtAfter !== publish.publishAtBefore) {
      status.privacyStatus = 'private';
      status.publishAt = publish.publishAtAfter;
      parts.add('status');
    } else if (!publish.publishAtAfter) {
      status.privacyStatus = after.privacyStatus;
      delete status.publishAt;
      parts.add('status');
    }
  } else if (!same(before.privacyStatus, after.privacyStatus)) {
    status.privacyStatus = after.privacyStatus;
    delete status.publishAt;
    parts.add('status');
  }

  const resource: YouTubeVideoResource = { id: current.id, snippet, status };

  if (!same(before.recordingDate, after.recordingDate)) {
    resource.recordingDetails = after.recordingDate ? { recordingDate: `${after.recordingDate}T00:00:00.000Z` } : {};
    parts.add('recordingDetails');
  }

  if (!same(before.translations, after.translations)) {
    resource.localizations = Object.fromEntries(after.translations.map((t) => [t.language, { title: t.title, description: t.description }]));
    parts.add('localizations');
    // Translations need a default language on the video
    if (!snippet.defaultLanguage && after.language) {
      Object.assign(snippet, { defaultLanguage: after.language });
      parts.add('snippet');
    }
  }

  return { resource, parts: [...parts] };
}
