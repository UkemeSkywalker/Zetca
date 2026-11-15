/**
 * Forgot-password / reset-password flow.
 *
 * A reset link carries a token "<userId>.<secret>". Only a SHA-256 hash of the
 * secret is stored on the user, with an expiry an hour out. Setting the new
 * password removes the hash in the same conditional write, so a link works
 * once, and asking again replaces the hash, so only the latest link works.
 */

import { createHash, randomBytes } from 'crypto';
import { hashPassword } from './password';
import { UserRepository, type UserRecord } from '../db/userRepository';
import { sendEmail as sesSendEmail, type SendEmail } from '../email/sendEmail';
import { siteUrl } from '../http/siteUrl';

export const FORGOT_PASSWORD_MESSAGE =
  'If an account exists for that email, we’ve sent a link to reset its password. Check your inbox.';
export const INVALID_LINK_MESSAGE = 'This reset link is invalid or has expired. Please request a new one.';

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
/** Emails sent to one address per window, however many IPs ask */
export const MAX_EMAILS_PER_ADDRESS = 3;
export const EMAIL_WINDOW_MS = 60 * 60 * 1000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{43}$/; // 32 random bytes, base64url

export function hashResetSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export function createResetToken(userId: string): { token: string; tokenHash: string } {
  const secret = randomBytes(32).toString('base64url');
  return { token: `${userId}.${secret}`, tokenHash: hashResetSecret(secret) };
}

export function parseResetToken(token: unknown): { userId: string; secret: string } | null {
  if (typeof token !== 'string') return null;
  const [userId, secret, ...rest] = token.split('.');
  if (rest.length || !userId || !secret || !UUID.test(userId) || !SECRET.test(secret)) return null;
  return { userId, secret };
}

type UserStore = Pick<UserRepository, 'getUserByEmail' | 'setPasswordResetToken' | 'resetPasswordWithToken'>;

export interface PasswordResetDeps {
  users: UserStore;
  sendEmail: SendEmail;
  resetPageUrl: () => URL;
  now?: () => number;
}

export class PasswordResetService {
  private sent = new Map<string, number[]>();

  constructor(private deps: PasswordResetDeps) {}

  private now() {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  /** True if this address may get another email now (and counts it) */
  private takeEmailSlot(email: string): boolean {
    const now = this.now();
    const recent = (this.sent.get(email) || []).filter((t) => now - t < EMAIL_WINDOW_MS);
    if (recent.length >= MAX_EMAILS_PER_ADDRESS) {
      this.sent.set(email, recent);
      return false;
    }
    recent.push(now);
    this.sent.set(email, recent);
    return true;
  }

  /**
   * Email a reset link if the address belongs to an account. Says nothing
   * either way: callers answer the same whatever happens here.
   * @param email a validated, lower-cased address
   */
  async requestReset(email: string): Promise<void> {
    if (!this.takeEmailSlot(email)) return;
    const user = await this.deps.users.getUserByEmail(email);
    if (!user) return;

    const { token, tokenHash } = createResetToken(user.userId);
    const expiresAt = new Date(this.now() + RESET_TOKEN_TTL_MS).toISOString();
    await this.deps.users.setPasswordResetToken(user.userId, tokenHash, expiresAt);

    const link = this.deps.resetPageUrl();
    link.searchParams.set('token', token);
    await this.deps.sendEmail(resetEmail(user, link.toString()));
  }

  /**
   * Set a new password with a reset token.
   * @returns false if the token is malformed, wrong, expired or already used
   */
  async resetPassword(token: unknown, newPassword: string): Promise<boolean> {
    const parsed = parseResetToken(token);
    if (!parsed) return false;
    const passwordHash = await hashPassword(newPassword);
    return this.deps.users.resetPasswordWithToken(
      parsed.userId,
      hashResetSecret(parsed.secret),
      passwordHash,
      new Date(this.now()).toISOString()
    );
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

export function resetEmail(user: Pick<UserRecord, 'email' | 'name'>, link: string) {
  const name = user.name?.trim() || 'there';
  const text = [
    `Hi ${name},`,
    '',
    'Someone asked to reset the password for your Zetca account. To choose a new password, open this link:',
    '',
    link,
    '',
    'The link works once and expires in 1 hour. If you didn’t ask for this, you can ignore this email; your password stays the same.',
    '',
    '— Zetca',
  ].join('\n');
  const html = `<p>Hi ${escapeHtml(name)},</p>
<p>Someone asked to reset the password for your Zetca account. To choose a new password, click the button below.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600">Reset your password</a></p>
<p>Or paste this link into your browser:<br><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>
<p>The link works once and expires in 1 hour. If you didn’t ask for this, you can ignore this email; your password stays the same.</p>
<p>— Zetca</p>`;
  return { to: user.email, subject: 'Reset your Zetca password', text, html };
}

let service: PasswordResetService | null = null;

export function getPasswordResetService(): PasswordResetService {
  if (!service) {
    service = new PasswordResetService({
      users: new UserRepository(),
      sendEmail: sesSendEmail,
      resetPageUrl: () => siteUrl('/reset-password'),
    });
  }
  return service;
}
