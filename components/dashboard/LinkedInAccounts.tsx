'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import type { PublicLinkedInAccount } from '@/lib/linkedin/accounts';

const DAY = 24 * 60 * 60 * 1000;

/** When the account needs reconnecting, if soon (LinkedIn tokens last about 60 days) */
function expiryNote(expiresAt?: string): { text: string; urgent: boolean } | null {
  if (!expiresAt) return null;
  const left = new Date(expiresAt).getTime() - Date.now();
  if (left <= 0) return { text: 'Expired · reconnect to keep posting', urgent: true };
  const days = Math.ceil(left / DAY);
  if (days > 14) return null;
  return { text: `Reconnect within ${days} day${days === 1 ? '' : 's'}`, urgent: days <= 3 };
}

/**
 * Every LinkedIn account the user posts to (theirs and their clients'), with
 * the default first. Posts go out as the default unless another is chosen.
 */
export function LinkedInAccounts({ onMessage }: { onMessage: (text: string, error?: boolean) => void }) {
  const [accounts, setAccounts] = useState<PublicLinkedInAccount[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/linkedin/accounts', { credentials: 'include' });
      const data = await res.json();
      setAccounts(res.ok ? data.accounts : []);
    } catch {
      setAccounts([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const disconnect = async (a: PublicLinkedInAccount) => {
    setBusy(a.id);
    try {
      const res = await fetch('/api/auth/linkedin/disconnect', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: a.id }),
      });
      if (!res.ok) throw new Error();
      await load();
      onMessage(`${a.name} disconnected.`);
    } catch {
      onMessage(`Couldn’t disconnect ${a.name}. Please try again.`, true);
    } finally {
      setBusy(null);
    }
  };

  const makeDefault = async (a: PublicLinkedInAccount) => {
    setBusy(a.id);
    try {
      const res = await fetch('/api/linkedin/accounts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultId: a.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAccounts(data.accounts);
      onMessage(`Posts now go to ${a.name} unless you choose another account.`);
    } catch (e) {
      onMessage((e as Error).message || 'Couldn’t change the default account.', true);
    } finally {
      setBusy(null);
    }
  };

  const connect = () => {
    window.location.href = '/api/auth/linkedin';
  };

  return (
    <div className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon icon="solar:linkedin-bold" className="text-3xl text-[#0A66C2]" aria-hidden />
          <div>
            <p className="font-medium text-gray-900">LinkedIn</p>
            <p className="text-sm text-gray-500">
              {accounts === null ? 'Loading…' : accounts.length ? `${accounts.length} account${accounts.length === 1 ? '' : 's'} connected` : 'Not connected'}
            </p>
          </div>
        </div>
        <Button variant={accounts?.length ? 'outline' : 'primary'} size="sm" onClick={connect}>
          {accounts?.length ? 'Connect another' : 'Connect'}
        </Button>
      </div>

      {accounts && accounts.length > 0 && (
        <ul className="mt-4 space-y-2" aria-label="Connected LinkedIn accounts">
          {accounts.map((a, i) => {
            const expiry = expiryNote(a.expiresAt);
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg bg-gray-50 px-3 py-2.5">
                {a.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.pictureUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0A66C2] text-sm font-bold text-white" aria-hidden>
                    {a.name.slice(0, 1)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                    <span className="truncate">{a.name}</span>
                    {i === 0 && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">Default</span>}
                  </p>
                  <p className={`text-xs ${expiry?.urgent ? 'font-semibold text-red-600' : 'text-gray-500'}`}>{expiry ? expiry.text : (a.email ?? 'Personal profile')}</p>
                </div>
                <div className="-ml-1 flex w-full flex-wrap items-center gap-1 pl-12">
                  {expiry && (
                    <button type="button" onClick={connect} className="rounded-md px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
                      Reconnect
                    </button>
                  )}
                  {i > 0 && (
                    <button type="button" disabled={busy === a.id} onClick={() => void makeDefault(a)} className="rounded-md px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50">
                      Make default
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() => void disconnect(a)}
                    aria-label={`Disconnect ${a.name}`}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Disconnect
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {accounts && accounts.length > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          Adding a client’s profile? LinkedIn connects whoever is signed in to LinkedIn in this browser. Sign out of LinkedIn first, then sign in as the client when it asks.
        </p>
      )}
    </div>
  );
}
