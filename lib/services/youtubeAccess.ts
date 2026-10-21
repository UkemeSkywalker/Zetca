/**
 * Access tokens for a user's connected YouTube channel.
 *
 * Google access tokens last an hour; each one is cached for 50 minutes so
 * the refresh token (stored encrypted) isn't used on every request.
 */

import { UserRepository } from '@/lib/db/userRepository';
import { decryptToken } from '@/lib/crypto/tokenCipher';
import { refreshAccessToken, YouTubeAuthError } from '@/lib/services/youtubeClient';

const TOKEN_TTL_MS = 50 * 60 * 1000;
const cache = new Map<string, { token: string; channelId: string; expiresAt: number }>();

export interface YouTubeAccess {
  accessToken: string;
  channelId: string;
}

export async function getYouTubeAccess(userId: string, users = new UserRepository()): Promise<YouTubeAccess> {
  const hit = cache.get(userId);
  if (hit && hit.expiresAt > Date.now()) return { accessToken: hit.token, channelId: hit.channelId };

  const user = await users.getUserById(userId);
  if (!user?.youtubeRefreshTokenEnc || !user.youtubeChannelId) {
    throw new YouTubeAuthError('No YouTube channel is connected', 'not_connected');
  }
  const accessToken = await refreshAccessToken(decryptToken(user.youtubeRefreshTokenEnc));
  cache.set(userId, { token: accessToken, channelId: user.youtubeChannelId, expiresAt: Date.now() + TOKEN_TTL_MS });
  return { accessToken, channelId: user.youtubeChannelId };
}

/** Forget a cached token, e.g. after the channel is disconnected or a call returns 401 */
export function forgetYouTubeAccess(userId: string): void {
  cache.delete(userId);
}
