/**
 * Encrypts long-lived OAuth tokens (e.g. a YouTube refresh token) before
 * they're stored, with AES-256-GCM. The key is TOKEN_ENCRYPTION_KEY: 32
 * random bytes, base64-encoded (openssl rand -base64 32).
 *
 * Stored form: "v1.<iv>.<auth tag>.<ciphertext>", each part base64url.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const VERSION = 'v1';

function key(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY ?? '';
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
  }
  return buf;
}

export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv, cipher.getAuthTag(), data].map((p) => (typeof p === 'string' ? p : p.toString('base64url'))).join('.');
}

export function decryptToken(stored: string): string {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Unrecognised encrypted token format');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
