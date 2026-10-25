'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { PENDING_PROMPT_KEY } from '@/components/strategist/TalkToZetca';

const noSubscribe = () => () => {};
const readPending = () => {
  try {
    return sessionStorage.getItem(PENDING_PROMPT_KEY);
  } catch {
    return null;
  }
};

/**
 * Talk to Zetca: the conversation. For now it shows what the user sent; the
 * research (brand, brand kit, competitors, plan) is being built next.
 */
export default function StrategistChatPage() {
  const message = useSyncExternalStore(noSubscribe, readPending, () => null);

  return (
    <div className="max-w-[720px] mx-auto flex flex-col gap-4 font-heading">
      <Link href="/dashboard/strategist" className="text-sm font-semibold text-[#4f46e5] hover:underline">
        ← Back to Strategist
      </Link>
      {message ? (
        <>
          <p className="self-end max-w-[85%] rounded-2xl rounded-br-md bg-[#4f46e5] px-4 py-3 text-[15px] leading-6 text-white whitespace-pre-wrap">{message}</p>
          <p className="self-start max-w-[85%] rounded-2xl rounded-bl-md bg-white border border-[#E2E8F0] px-4 py-3 text-[15px] leading-6 text-[#0b1c30]">
            Thanks. Researching your brand from a message is coming very soon. Until then, you can build a strategy step by step.{' '}
            <Link href="/dashboard/strategist/new" className="font-semibold text-[#4f46e5] hover:underline">
              Answer the questions
            </Link>
          </p>
        </>
      ) : (
        <p className="text-[15px] text-[#464555]">Tell Zetca about your business on the Strategist page to start.</p>
      )}
    </div>
  );
}
