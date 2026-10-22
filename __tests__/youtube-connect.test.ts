/**
 * @jest-environment node
 */

import { randomBytes } from 'crypto';

process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
process.env.YOUTUBE_CLIENT_ID = 'client-123.apps.googleusercontent.com';
process.env.YOUTUBE_CLIENT_SECRET = 'GOCSPX-test';
process.env.YOUTUBE_REDIRECT_URI = 'http://localhost:3000/api/auth/youtube/callback';

import { encryptToken, decryptToken } from '@/lib/crypto/tokenCipher';
import { buildAuthUrl, exchangeCode, getMyChannel, refreshAccessToken, YOUTUBE_SCOPES, YOUTUBE_ANALYTICS_SCOPE } from '@/lib/services/youtubeClient';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function mockFetch(...responses: { status?: number; body: unknown }[]) {
  const fn = jest.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce(new Response(JSON.stringify(r.body), { status: r.status ?? 200 }));
  }
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('tokenCipher', () => {
  it('round-trips a token, and never stores it in plain text', () => {
    const stored = encryptToken('1//refresh-token-value');
    expect(stored).not.toContain('refresh-token-value');
    expect(stored.startsWith('v1.')).toBe(true);
    expect(decryptToken(stored)).toBe('1//refresh-token-value');
  });

  it('uses a fresh IV each time', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'));
  });

  it('rejects a tampered token', () => {
    const parts = encryptToken('secret').split('.');
    parts[3] = Buffer.from('tampered').toString('base64url');
    expect(() => decryptToken(parts.join('.'))).toThrow();
  });
});

describe('youtubeClient', () => {
  it('asks Google for offline access to both YouTube scopes, with the state', () => {
    const url = new URL(buildAuthUrl('state-abc'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('client-123.apps.googleusercontent.com');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:3000/api/auth/youtube/callback');
    // Analytics is asked for too, but it's optional (see the next tests)
    expect(url.searchParams.get('scope')?.split(' ')).toEqual([...YOUTUBE_SCOPES, YOUTUBE_ANALYTICS_SCOPE]);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('state')).toBe('state-abc');
  });

  it('returns tokens when every scope was granted', async () => {
    mockFetch({ body: { access_token: 'a', refresh_token: 'r', scope: YOUTUBE_SCOPES.join(' ') } });
    await expect(exchangeCode('code')).resolves.toEqual({ accessToken: 'a', refreshToken: 'r', scopes: YOUTUBE_SCOPES });
  });

  it('rejects (and revokes) a sign-in where a permission was unticked', async () => {
    const fetchMock = mockFetch(
      { body: { access_token: 'a', refresh_token: 'r', scope: YOUTUBE_SCOPES[0] } },
      { body: {} } // the revoke call
    );
    await expect(exchangeCode('code')).rejects.toMatchObject({ code: 'missing_scope' });
    expect(String(fetchMock.mock.calls[1][0])).toContain('/revoke');
  });

  it('needs a refresh token', async () => {
    mockFetch({ body: { access_token: 'a', scope: YOUTUBE_SCOPES.join(' ') } });
    await expect(exchangeCode('code')).rejects.toMatchObject({ code: 'exchange_failed' });
  });

  it('reads the chosen channel, and reports accounts without one', async () => {
    mockFetch({
      body: { items: [{ id: 'UC1', snippet: { title: 'Alex Vance Studio', customUrl: '@alexvance', thumbnails: { medium: { url: 'https://yt3/x.jpg' } } } }] },
    });
    await expect(getMyChannel('a')).resolves.toEqual({
      id: 'UC1',
      title: 'Alex Vance Studio',
      customUrl: '@alexvance',
      thumbnailUrl: 'https://yt3/x.jpg',
    });
    mockFetch({ body: { items: [] } });
    await expect(getMyChannel('a')).rejects.toMatchObject({ code: 'no_channel' });
  });

  it('reports a revoked refresh token distinctly', async () => {
    mockFetch({ status: 400, body: { error: 'invalid_grant' } });
    await expect(refreshAccessToken('r')).rejects.toMatchObject({ code: 'token_revoked' });
  });
});

describe('GET /api/auth/youtube/callback', () => {
  const connectYouTube = jest.fn();
  beforeEach(() => {
    jest.resetModules();
    connectYouTube.mockReset();
    jest.doMock('@/lib/middleware/withAuth', () => ({
      withAuth: async (fn: (req: unknown, userId: string) => Promise<Response>) => (req: unknown) => fn(req, 'user-1'),
    }));
    jest.doMock('@/lib/middleware/withRateLimit', () => ({ withRateLimit: (h: unknown) => h }));
    jest.doMock('@/lib/db/userRepository', () => ({ UserRepository: jest.fn(() => ({ connectYouTube })) }));
  });

  async function callback(query: string, cookieState?: string) {
    const { NextRequest } = await import('next/server');
    const { GET } = await import('@/app/api/auth/youtube/callback/route');
    const req = new NextRequest(`http://localhost:3000/api/auth/youtube/callback?${query}`, {
      headers: cookieState ? { cookie: `youtube_oauth_state=${cookieState}` } : {},
    });
    const res = await GET(req);
    return new URL(res.headers.get('location')!).search;
  }

  it('refuses a callback whose state does not match the cookie', async () => {
    expect(await callback('code=c&state=evil', 'good')).toBe('?youtube_error=state_mismatch');
    expect(connectYouTube).not.toHaveBeenCalled();
  });

  it('stores the channel with the refresh token encrypted', async () => {
    mockFetch(
      { body: { access_token: 'a', refresh_token: 'refresh-xyz', scope: YOUTUBE_SCOPES.join(' ') } },
      { body: { items: [{ id: 'UC1', snippet: { title: 'Alex Vance Studio' } }] } }
    );
    expect(await callback('code=c&state=s1', 's1')).toBe('?youtube=connected');
    const [userId, saved] = connectYouTube.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(saved).toMatchObject({ channelId: 'UC1', channelTitle: 'Alex Vance Studio' });
    expect(saved.refreshTokenEnc).not.toContain('refresh-xyz');
    const { decryptToken: decrypt } = await import('@/lib/crypto/tokenCipher');
    expect(decrypt(saved.refreshTokenEnc)).toBe('refresh-xyz');
  });

  it('returns to the page the user started from, but only a known one', async () => {
    const { NextRequest } = await import('next/server');
    const { GET } = await import('@/app/api/auth/youtube/callback/route');
    const run = async (returnTo: string) => {
      mockFetch(
        { body: { access_token: 'a', refresh_token: 'r', scope: YOUTUBE_SCOPES.join(' ') } },
        { body: { items: [{ id: 'UC1', snippet: { title: 'Studio' } }] } }
      );
      const req = new NextRequest('http://localhost:3000/api/auth/youtube/callback?code=c&state=s1', {
        headers: { cookie: `youtube_oauth_state=s1; youtube_oauth_return=${encodeURIComponent(returnTo)}` },
      });
      const location = new URL((await GET(req)).headers.get('location')!);
      return location.pathname + location.search;
    };
    expect(await run('/dashboard/scheduler/youtube/new')).toBe('/dashboard/scheduler/youtube/new?youtube=connected');
    expect(await run('https://evil.example')).toBe('/dashboard/profile?youtube=connected');
  });

  it('passes "denied" through when the user cancels on Google', async () => {
    expect(await callback('error=access_denied&state=s1', 's1')).toBe('?youtube_error=denied');
  });
});
