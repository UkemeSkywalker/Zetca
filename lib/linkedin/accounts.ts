/**
 * Connected LinkedIn accounts. A user can connect several (a social media
 * manager posting for clients), each kept on the user record with its token
 * encrypted. Older users have one connection in the single linkedin* fields;
 * that one reads as the first account until they connect another.
 */

import { decryptToken } from '@/lib/crypto/tokenCipher';

export interface LinkedInAccount {
  /** The LinkedIn member id (OpenID "sub") */
  id: string;
  kind: 'person';
  name: string;
  pictureUrl?: string;
  email?: string;
  /** Access token, encrypted with lib/crypto/tokenCipher (never sent to the browser) */
  tokenEnc?: string;
  /** Plain token from before accounts were encrypted (the old single connection) */
  token?: string;
  connectedAt: string;
  /** When LinkedIn says the token stops working (UTC ISO) */
  expiresAt?: string;
}

/** The fields accountsOf reads from a user record */
export interface LinkedInUserFields {
  linkedinAccounts?: LinkedInAccount[];
  linkedinSub?: string;
  linkedinAccessToken?: string;
  linkedinName?: string;
  linkedinPictureUrl?: string;
  linkedinEmail?: string;
  linkedinConnectedAt?: string;
}

/** Every connected account, the first being the default */
export function accountsOf(user: LinkedInUserFields): LinkedInAccount[] {
  const list = [...(user.linkedinAccounts ?? [])];
  if (user.linkedinSub && user.linkedinAccessToken && !list.some((a) => a.id === user.linkedinSub)) {
    list.unshift({
      id: user.linkedinSub,
      kind: 'person',
      name: user.linkedinName ?? 'LinkedIn',
      pictureUrl: user.linkedinPictureUrl,
      email: user.linkedinEmail,
      token: user.linkedinAccessToken,
      connectedAt: user.linkedinConnectedAt ?? new Date(0).toISOString(),
    });
  }
  return list;
}

/** The account a post goes out as: the one chosen, or the default */
export function pickAccount(accounts: LinkedInAccount[], accountId?: string | null): LinkedInAccount | undefined {
  return (accountId ? accounts.find((a) => a.id === accountId) : undefined) ?? (accountId ? undefined : accounts[0]);
}

export function tokenOf(account: LinkedInAccount): string | undefined {
  if (account.tokenEnc) return decryptToken(account.tokenEnc);
  return account.token;
}

/** What the browser may see of an account */
export function publicAccount(a: LinkedInAccount) {
  return {
    id: a.id,
    kind: a.kind,
    name: a.name,
    pictureUrl: a.pictureUrl,
    email: a.email,
    connectedAt: a.connectedAt,
    expiresAt: a.expiresAt,
  };
}
export type PublicLinkedInAccount = ReturnType<typeof publicAccount>;
