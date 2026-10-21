'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { writeVideoCopy } from '@/lib/api/youtubeApi';
import type { VideoWriterResponse } from '@/lib/models/videoWriter';
import { INPUT } from './formKit';

export function WriteWithCopywriter({
  filename,
  durationSeconds,
  isShort,
  language,
  onWritten,
}: {
  filename: string;
  durationSeconds?: number;
  isShort: boolean;
  language: string;
  onWritten: (copy: VideoWriterResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!busy && panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !busy && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open, busy]);

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      const copy = await writeVideoCopy({ brief, filename, durationSeconds, isShort, language });
      onWritten(copy);
      setOpen(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-700"
      >
        <Icon icon="solar:magic-stick-3-linear" className="w-4 h-4" />
        Write with Copywriter
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Write with Copywriter"
          className="absolute right-0 top-full mt-2 z-30 w-[min(360px,calc(100vw-48px))] rounded-2xl bg-white shadow-xl border border-[#c7c4d8]/40 p-4"
        >
          <label htmlFor="video-brief" className="block text-sm font-semibold text-on-surface">
            What’s the video about?
          </label>
          <p className="text-xs text-outline mt-0.5">
            The Copywriter writes the title, description and tags. You can edit everything after.
          </p>
          <textarea
            id="video-brief"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
            maxLength={2000}
            autoFocus
            placeholder="e.g. A 15-minute full body workout with no equipment, for beginners training at home"
            className={`${INPUT} mt-3 resize-none`}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && brief.trim().length >= 3) write();
            }}
          />
          {error && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[11px] text-outline">Replaces the title, description and tags</span>
            <button
              type="button"
              onClick={write}
              disabled={busy || brief.trim().length < 3}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" /> : <Icon icon="solar:pen-new-square-linear" className="w-4 h-4" />}
              {busy ? 'Writing…' : 'Write'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
