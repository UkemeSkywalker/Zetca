/**
 * @jest-environment node
 */
import { accountsOf, pickAccount, publicAccount, tokenOf, type LinkedInAccount } from '@/lib/linkedin/accounts';

const acct = (id: string, extra: Partial<LinkedInAccount> = {}): LinkedInAccount => ({ id, kind: 'person', name: id, token: `t-${id}`, connectedAt: '2026-11-01T00:00:00.000Z', ...extra });

describe('LinkedIn accounts', () => {
  it('reads the old single connection as the first account', () => {
    const list = accountsOf({ linkedinSub: 'old', linkedinAccessToken: 'tok', linkedinName: 'Ade', linkedinAccounts: [acct('b')] });
    expect(list.map((a) => a.id)).toEqual(['old', 'b']);
    expect(tokenOf(list[0])).toBe('tok');
  });

  it('does not list the old connection twice once it has moved', () => {
    expect(accountsOf({ linkedinSub: 'a', linkedinAccessToken: 'x', linkedinAccounts: [acct('a')] })).toHaveLength(1);
  });

  it('has no accounts when nothing is connected', () => {
    expect(accountsOf({})).toEqual([]);
  });

  it('picks the chosen account, or the default when none is chosen', () => {
    const list = [acct('a'), acct('b')];
    expect(pickAccount(list, 'b')?.id).toBe('b');
    expect(pickAccount(list)?.id).toBe('a');
  });

  it('never falls back to another account when the chosen one is gone', () => {
    expect(pickAccount([acct('a')], 'client-removed')).toBeUndefined();
  });

  it('never exposes tokens to the browser', () => {
    const shown = publicAccount(acct('a', { tokenEnc: 'secret' }));
    expect(JSON.stringify(shown)).not.toMatch(/t-a|secret/);
  });
});
