'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PublicLinkedInAccount } from '@/lib/linkedin/accounts';

/**
 * "Post as": which connected LinkedIn account a post goes out as. No choice
 * (null) means the default account, so changing the default moves those posts.
 */
export function LinkedInAccountPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const [accounts, setAccounts] = useState<PublicLinkedInAccount[] | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/linkedin/accounts', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((d) => live && setAccounts(d.accounts ?? []))
      .catch(() => live && setAccounts([]));
    return () => {
      live = false;
    };
  }, []);

  if (accounts === null) return null;
  if (!accounts.length) {
    return (
      <p className="mt-2 text-sm text-on-surface-variant">
        No LinkedIn account connected.{' '}
        <Link href="/dashboard/profile" className="font-semibold text-primary hover:underline">
          Connect one
        </Link>{' '}
        so this can post.
      </p>
    );
  }
  const chosenGone = value !== null && !accounts.some((a) => a.id === value);
  return (
    <div className="mt-3">
      <label htmlFor="post-as" className="block text-sm font-medium text-on-surface mb-1">
        Post as
      </label>
      <select
        id="post-as"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-on-surface"
      >
        <option value="">{accounts[0].name} (default)</option>
        {accounts.slice(1).map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
        {chosenGone && <option value={value!}>Disconnected account</option>}
      </select>
      {chosenGone && <p className="mt-1 text-sm text-red-600">That account was disconnected. Choose another, or this post won’t publish.</p>}
    </div>
  );
}
