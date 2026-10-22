/**
 * @jest-environment node
 */

import { channelSearches, clearChannelSearchCache } from '@/lib/services/channelSearchService';
import { YOUTUBE_ANALYTICS_SCOPE, YouTubeApiError } from '@/lib/services/youtubeClient';
import { relatedTo } from '@/lib/youtube/research';

const users = (scopes: string[]) => ({ getUserById: async () => ({ userId: 'u1', youtubeScopes: scopes }) as never });
const access = async () => ({ accessToken: 't', channelId: 'UC1' });

describe('channelSearches', () => {
  beforeEach(() => clearChannelSearchCache());

  it('needs the analytics permission', async () => {
    expect(await channelSearches('u1', { users: users([]), access })).toEqual({ available: false, reason: 'no_permission' });
  });

  it('returns the channel’s search terms and caches them', async () => {
    const fetchTerms = jest.fn(async () => [{ term: 'home workout', views: 120 }]);
    const deps = { users: users([YOUTUBE_ANALYTICS_SCOPE]), access, fetchTerms };
    expect(await channelSearches('u1', deps)).toEqual({ available: true, terms: [{ term: 'home workout', views: 120 }] });
    await channelSearches('u1', deps);
    expect(fetchTerms).toHaveBeenCalledTimes(1);
  });

  it('explains when the Analytics API isn’t switched on', async () => {
    const fetchTerms = jest.fn(async () => {
      throw new YouTubeApiError('YouTube Analytics API has not been used in project 123', 403, 'accessNotConfigured');
    });
    expect(await channelSearches('u1', { users: users([YOUTUBE_ANALYTICS_SCOPE]), access, fetchTerms })).toEqual({
      available: false,
      reason: 'not_enabled',
    });
  });
});

describe('relatedTo', () => {
  it('matches on meaningful shared words only', () => {
    expect(relatedTo('squats at home for women', 'home workout with squats')).toBe(true);
    expect(relatedTo('the best one', 'the best workout')).toBe(false);
  });
});
