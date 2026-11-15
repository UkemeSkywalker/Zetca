/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  PasswordResetService,
  createResetToken,
  parseResetToken,
  hashResetSecret,
  RESET_TOKEN_TTL_MS,
  FORGOT_PASSWORD_MESSAGE,
  INVALID_LINK_MESSAGE,
} from '@/lib/auth/passwordReset';
import { verifyPassword } from '@/lib/auth/password';
import { UserRepository, type UserRecord } from '@/lib/db/userRepository';
import type { EmailMessage } from '@/lib/email/sendEmail';

const USER_ID = '3f2b6c1e-8d4a-4c3b-9a7e-1b2c3d4e5f60';

/** In-memory users table with the same conditional semantics as UserRepository */
function fakeStore(users: UserRecord[]) {
  const byId = new Map(users.map((u) => [u.userId, { ...u }]));
  return {
    byId,
    getUserByEmail: jest.fn(async (email: string) => [...byId.values()].find((u) => u.email === email) || null),
    setPasswordResetToken: jest.fn(async (userId: string, hash: string, expiresAt: string) => {
      const u = byId.get(userId);
      if (!u) throw new Error('ConditionalCheckFailedException');
      u.passwordResetTokenHash = hash;
      u.passwordResetExpiresAt = expiresAt;
    }),
    resetPasswordWithToken: jest.fn(async (userId: string, hash: string, newHash: string, now: string) => {
      const u = byId.get(userId);
      if (!u || u.passwordResetTokenHash !== hash || !u.passwordResetExpiresAt || !(u.passwordResetExpiresAt > now)) {
        return false;
      }
      u.passwordHash = newHash;
      u.passwordChangedAt = now;
      delete u.passwordResetTokenHash;
      delete u.passwordResetExpiresAt;
      return true;
    }),
  };
}

function setup() {
  const store = fakeStore([
    {
      userId: USER_ID,
      email: 'ada@example.com',
      name: 'Ada',
      passwordHash: 'old-hash',
      createdAt: '2026-01-01T00:00:00.000Z',
      lastModified: '2026-01-01T00:00:00.000Z',
    },
  ]);
  const emails: EmailMessage[] = [];
  let clock = Date.parse('2026-11-15T12:00:00.000Z');
  const service = new PasswordResetService({
    users: store,
    sendEmail: async (m) => {
      emails.push(m);
    },
    resetPageUrl: () => new URL('https://zetca.pro/reset-password'),
    now: () => clock,
  });
  const tokenFrom = (m: EmailMessage) => {
    const link = m.text.match(/https:\/\/zetca\.pro\/reset-password\?token=\S+/)![0];
    return new URL(link).searchParams.get('token')!;
  };
  return { store, emails, service, tokenFrom, tick: (ms: number) => (clock += ms) };
}

describe('reset tokens', () => {
  it('carry the user id and a random secret, and only the hash is kept', () => {
    const { token, tokenHash } = createResetToken(USER_ID);
    const parsed = parseResetToken(token)!;
    expect(parsed.userId).toBe(USER_ID);
    expect(tokenHash).toBe(hashResetSecret(parsed.secret));
    expect(tokenHash).not.toContain(parsed.secret);
    expect(createResetToken(USER_ID).token).not.toBe(token);
  });

  it('rejects malformed tokens', () => {
    for (const bad of [undefined, 42, '', 'abc', `${USER_ID}`, `${USER_ID}.short`, `not-a-uuid.${'a'.repeat(43)}`, `${USER_ID}.${'a'.repeat(43)}.x`]) {
      expect(parseResetToken(bad)).toBeNull();
    }
  });
});

describe('PasswordResetService', () => {
  it('emails a link, stores only its hash with a 1-hour expiry, and the new password works', async () => {
    const { store, emails, service, tokenFrom } = setup();
    await service.requestReset('ada@example.com');

    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe('ada@example.com');
    const token = tokenFrom(emails[0]);
    expect(emails[0].html).toContain(token);

    const user = store.byId.get(USER_ID)!;
    expect(user.passwordResetTokenHash).toBe(hashResetSecret(parseResetToken(token)!.secret));
    expect(JSON.stringify(user)).not.toContain(parseResetToken(token)!.secret);
    expect(Date.parse(user.passwordResetExpiresAt!)).toBe(Date.parse('2026-11-15T12:00:00.000Z') + RESET_TOKEN_TTL_MS);

    await expect(service.resetPassword(token, 'brand-new-password')).resolves.toBe(true);
    expect(await verifyPassword('brand-new-password', store.byId.get(USER_ID)!.passwordHash)).toBe(true);
  });

  it('lets a link be used only once', async () => {
    const { emails, service, tokenFrom } = setup();
    await service.requestReset('ada@example.com');
    const token = tokenFrom(emails[0]);
    await expect(service.resetPassword(token, 'first-new-password')).resolves.toBe(true);
    await expect(service.resetPassword(token, 'second-new-password')).resolves.toBe(false);
  });

  it('refuses a link after it expires', async () => {
    const { emails, service, tokenFrom, tick } = setup();
    await service.requestReset('ada@example.com');
    tick(RESET_TOKEN_TTL_MS + 1);
    await expect(service.resetPassword(tokenFrom(emails[0]), 'brand-new-password')).resolves.toBe(false);
  });

  it('makes an earlier link stop working when a new one is sent', async () => {
    const { emails, service, tokenFrom } = setup();
    await service.requestReset('ada@example.com');
    await service.requestReset('ada@example.com');
    await expect(service.resetPassword(tokenFrom(emails[0]), 'brand-new-password')).resolves.toBe(false);
    await expect(service.resetPassword(tokenFrom(emails[1]), 'brand-new-password')).resolves.toBe(true);
  });

  it('refuses a guessed or tampered token', async () => {
    const { emails, service, tokenFrom } = setup();
    await service.requestReset('ada@example.com');
    const token = tokenFrom(emails[0]);
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    await expect(service.resetPassword(tampered, 'brand-new-password')).resolves.toBe(false);
    await expect(service.resetPassword(`${USER_ID}.${'x'.repeat(43)}`, 'brand-new-password')).resolves.toBe(false);
  });

  it('sends nothing for an unknown address', async () => {
    const { store, emails, service } = setup();
    await service.requestReset('nobody@example.com');
    expect(emails).toHaveLength(0);
    expect(store.setPasswordResetToken).not.toHaveBeenCalled();
  });

  it('sends at most 3 emails an hour to one address', async () => {
    const { emails, service, tick } = setup();
    for (let i = 0; i < 5; i++) await service.requestReset('ada@example.com');
    expect(emails).toHaveLength(3);
    tick(60 * 60 * 1000);
    await service.requestReset('ada@example.com');
    expect(emails).toHaveLength(4);
  });
});

describe('UserRepository.resetPasswordWithToken', () => {
  function repoWith(send: jest.Mock) {
    const repo = new UserRepository();
    (repo as unknown as { docClient: { send: jest.Mock } }).docClient = { send };
    return repo;
  }

  it('sets the password and removes the token in one conditional write', async () => {
    const send = jest.fn().mockResolvedValue({});
    await expect(repoWith(send).resetPasswordWithToken(USER_ID, 'hash', 'new-hash', '2026-11-15T12:00:00.000Z')).resolves.toBe(true);
    const input = send.mock.calls[0][0].input;
    expect(input.Key).toEqual({ userId: USER_ID });
    expect(input.UpdateExpression).toMatch(/REMOVE #hash, #expires/);
    expect(input.ConditionExpression).toBe('attribute_exists(userId) AND #hash = :hash AND #expires > :now');
    expect(input.ExpressionAttributeValues).toMatchObject({ ':hash': 'hash', ':password': 'new-hash' });
  });

  it('returns false when the condition fails, and rethrows other errors', async () => {
    const failed = Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
    await expect(repoWith(jest.fn().mockRejectedValue(failed)).resetPasswordWithToken(USER_ID, 'h', 'n', 'now')).resolves.toBe(false);
    await expect(repoWith(jest.fn().mockRejectedValue(new Error('boom'))).resetPasswordWithToken(USER_ID, 'h', 'n', 'now')).rejects.toThrow('boom');
  });
});

describe('password reset API routes', () => {
  const requestReset = jest.fn();
  const resetPassword = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    requestReset.mockReset().mockResolvedValue(undefined);
    resetPassword.mockReset();
    jest.doMock('next/server', () => ({
      ...jest.requireActual('next/server'),
      after: (fn: () => unknown) => fn(),
    }));
    jest.doMock('@/lib/auth/passwordReset', () => ({
      ...jest.requireActual('@/lib/auth/passwordReset'),
      getPasswordResetService: () => ({ requestReset, resetPassword }),
    }));
  });

  const post = (path: string, body: unknown, ip = '203.0.113.7') =>
    new NextRequest(`http://localhost:3000${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
      body: JSON.stringify(body),
    });

  it('answers the same whether or not the email is registered', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    requestReset.mockImplementationOnce(async () => {
      throw new Error('SES is down');
    });
    const a = await POST(post('/api/auth/forgot-password', { email: 'Ada@Example.com' }, '198.51.100.1'));
    const b = await POST(post('/api/auth/forgot-password', { email: 'nobody@example.com' }, '198.51.100.1'));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(await a.json()).toEqual({ success: true, message: FORGOT_PASSWORD_MESSAGE });
    expect(await b.json()).toEqual({ success: true, message: FORGOT_PASSWORD_MESSAGE });
    expect(requestReset).toHaveBeenCalledWith('ada@example.com');
    expect(console.error).toHaveBeenCalled();
    jest.mocked(console.error).mockRestore();
  });

  it('rejects an invalid email and rate-limits by IP', async () => {
    const { POST } = await import('@/app/api/auth/forgot-password/route');
    expect((await POST(post('/api/auth/forgot-password', { email: 'nope' }, '198.51.100.2'))).status).toBe(400);
    for (let i = 0; i < 4; i++) {
      expect((await POST(post('/api/auth/forgot-password', { email: 'ada@example.com' }, '198.51.100.2'))).status).toBe(200);
    }
    expect((await POST(post('/api/auth/forgot-password', { email: 'ada@example.com' }, '198.51.100.2'))).status).toBe(429);
  });

  it('resets with a valid token, and refuses weak passwords and bad links', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    resetPassword.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const ok = await POST(post('/api/auth/reset-password', { token: 't', password: 'brand-new-password' }, '198.51.100.3'));
    expect(ok.status).toBe(200);
    expect(resetPassword).toHaveBeenCalledWith('t', 'brand-new-password');

    const bad = await POST(post('/api/auth/reset-password', { token: 't', password: 'brand-new-password' }, '198.51.100.3'));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error).toBe(INVALID_LINK_MESSAGE);

    const weak = await POST(post('/api/auth/reset-password', { token: 't', password: 'short' }, '198.51.100.3'));
    expect(weak.status).toBe(400);
    expect((await weak.json()).field).toBe('password');
    expect(resetPassword).toHaveBeenCalledTimes(2);
  });

  it('rate-limits reset attempts by IP', async () => {
    const { POST } = await import('@/app/api/auth/reset-password/route');
    resetPassword.mockResolvedValue(false);
    for (let i = 0; i < 10; i++) {
      await POST(post('/api/auth/reset-password', { token: 't', password: 'brand-new-password' }, '198.51.100.4'));
    }
    expect((await POST(post('/api/auth/reset-password', { token: 't', password: 'brand-new-password' }, '198.51.100.4'))).status).toBe(429);
  });
});
