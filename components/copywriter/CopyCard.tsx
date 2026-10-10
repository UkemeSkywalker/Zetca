'use client';

import { Icon } from '@iconify/react';
import { useState } from 'react';
import type { CopyRecord } from '@/types/agent';
import { clipboardText, copyToClipboard, formatHashtags, platformInfo } from './platforms';

const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

interface CopyCardProps {
  copy: CopyRecord;
  /** Just arrived from a running job or the chat */
  fresh: boolean;
  onOpen: () => void;
  onDelete: () => Promise<void>;
}

export function CopyCard({ copy, fresh, onOpen, onDelete }: CopyCardProps) {
  const platform = platformInfo(copy.platform);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const over = copy.text.length > platform.limit;
  const tags = formatHashtags(copy.hashtags);

  const copyText = async () => {
    if (await copyToClipboard(clipboardText(copy.text, copy.hashtags))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl p-5 shadow-sm border border-[#c7c4d8]/25 hover:border-[#4f46e5]/30 flex flex-col gap-3 transition-all hover:shadow-md ${
        fresh ? 'animate-[copyIn_0.45s_ease-out]' : ''
      }`}
    >
      {/* The whole card opens the editor; the buttons sit above this */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open ${platform.label} copy${copy.angle ? `: ${copy.angle}` : ''}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f46e5]"
      />

      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${platform.badge}`} title={platform.label}>
          <Icon icon={platform.icon} width={14} height={14} />
        </span>
        {copy.angle && (
          <span className={`px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#464555] ${LABEL_SM} truncate`}>{copy.angle}</span>
        )}
        {fresh && <span className={`px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ${LABEL_SM}`}>New</span>}
        <div className="ml-auto flex items-center gap-0.5 relative z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={copyText}
            aria-label="Copy text and hashtags"
            title={copied ? 'Copied' : 'Copy'}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#777587] hover:text-[#0b1c30] hover:bg-[#eff4ff]"
          >
            <Icon icon={copied ? 'material-symbols:check' : 'material-symbols:content-copy-outline'} width={16} height={16} />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label="Delete copy"
            title="Delete"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#777587] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/60"
          >
            <Icon icon="material-symbols:delete-outline" width={16} height={16} />
          </button>
        </div>
      </div>

      <p className="text-[14px] leading-[22px] text-[#0b1c30] whitespace-pre-line line-clamp-6">{copy.text}</p>

      {tags.length > 0 && (
        <p className="text-[12px] leading-[18px] font-medium text-[#3525cd] line-clamp-1">{tags.join(' ')}</p>
      )}

      <div className="mt-auto pt-3 border-t border-[#e5eeff] flex items-center justify-between gap-2">
        <span className={`${LABEL_SM} ${over ? 'text-[#ba1a1a]' : 'text-[#777587]'}`}>
          {copy.text.length.toLocaleString()} / {platform.limit.toLocaleString()}
        </span>
        <span className={`${LABEL_SM} text-[#3525cd] inline-flex items-center gap-0.5`}>
          Edit
          <Icon icon="material-symbols:arrow-forward" width={13} height={13} />
        </span>
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-label="Delete this copy?"
          className="absolute inset-0 z-20 rounded-2xl bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-5 text-center"
        >
          <p className="text-[15px] font-bold text-[#0b1c30]">Delete this copy?</p>
          <div className="flex gap-2">
            <button
              type="button"
              autoFocus
              disabled={deleting}
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-xl bg-white border border-[#c7c4d8]/60 text-[13px] font-semibold text-[#0b1c30] hover:bg-[#eff4ff] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={remove}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ba1a1a] text-white text-[13px] font-semibold hover:bg-[#93000a] disabled:opacity-70"
            >
              {deleting && <Icon icon="material-symbols:progress-activity" width={15} height={15} className="animate-spin" />}
              <span className="text-inherit">{deleting ? 'Deleting…' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Placeholder for a copy that's still being written */
export function CopyCardSkeleton({ platform }: { platform: string }) {
  const info = platformInfo(platform);
  return (
    <div className="bg-white/70 rounded-2xl p-5 border border-dashed border-[#c7c4d8]/50 flex flex-col gap-3" aria-hidden="true">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center opacity-60 ${info.badge}`}>
          <Icon icon={info.icon} width={14} height={14} />
        </span>
        <span className="h-4 w-20 rounded-full bg-[#e5eeff] animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-3 rounded bg-[#eff4ff] animate-pulse" />
        <div className="h-3 rounded bg-[#eff4ff] animate-pulse w-11/12" />
        <div className="h-3 rounded bg-[#eff4ff] animate-pulse w-4/5" />
        <div className="h-3 rounded bg-[#eff4ff] animate-pulse w-2/3" />
      </div>
      <p className="mt-auto pt-3 border-t border-[#e5eeff] text-[11px] font-bold tracking-[0.05em] text-[#777587] inline-flex items-center gap-1.5">
        <Icon icon="material-symbols:progress-activity" width={13} height={13} className="animate-spin" />
        Writing…
      </p>
    </div>
  );
}
