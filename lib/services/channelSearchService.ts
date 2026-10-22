/**
 * The searches that already bring viewers to a creator's channel, from
 * YouTube Analytics. Real data about their own audience, so it's the
 * strongest signal for which keywords to use. Cached for a day per user.
 */

import { UserRepository } from '@/lib/db/userRepository';
import { getYouTubeAccess } from './youtubeAccess';
import { getChannelSearchTerms, YOUTUBE_ANALYTICS_SCOPE, YouTubeApiError } from './youtubeClient';

const CACHE_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; terms: { term: string; views: number }[] }>();

export type ChannelSearches =
  | { available: true; terms: { term: string; views: number }[] }
  | { available: false; reason: 'no_permission' | 'not_enabled' | 'unavailable' };

export async function channelSearches(
  userId: string,
  deps: { users?: Pick<UserRepository, 'getUserById'>; access?: typeof getYouTubeAccess; fetchTerms?: typeof getChannelSearchTerms } = {}
): Promise<ChannelSearches> {
  const user = await (deps.users ?? new UserRepository()).getUserById(userId);
  if (!user?.youtubeScopes?.includes(YOUTUBE_ANALYTICS_SCOPE)) return { available: false, reason: 'no_permission' };

  const hit = cache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return { available: true, terms: hit.terms };
  try {
    const { accessToken } = await (deps.access ?? getYouTubeAccess)(userId);
    const terms = await (deps.fetchTerms ?? getChannelSearchTerms)(accessToken);
    cache.set(userId, { at: Date.now(), terms });
    return { available: true, terms };
  } catch (error) {
    // The YouTube Analytics API isn't switched on for the Google Cloud project
    if (error instanceof YouTubeApiError && (error.reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(error.message))) {
      return { available: false, reason: 'not_enabled' };
    }
    if (error instanceof YouTubeApiError && error.status === 403) return { available: false, reason: 'no_permission' };
    console.warn(`Channel searches for ${userId} failed: ${(error as Error).message}`);
    return { available: false, reason: 'unavailable' };
  }
}

/** For tests */
export function clearChannelSearchCache() {
  cache.clear();
}
