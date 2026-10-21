'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getTranscriptStatus, suggestChapters, type TranscriptStatus } from '@/lib/api/youtubeApi';
import { formatTimestamp } from '@/lib/youtube/chapters';

const POLL_MS = 4000;

/**
 * Chapter suggestions from the video's transcript. Shows the transcript's
 * progress (it starts as soon as the upload finishes), then offers chapters
 * with real times from what's said in the video.
 */
export function TranscriptChapters({
  mediaId,
  onApply,
}: {
  /** Set once the video has finished uploading */
  mediaId?: string;
  onApply: (chapters: { seconds: number; title: string }[]) => void;
}) {
  const [status, setStatus] = useState<TranscriptStatus | null>(null);
  const [chapters, setChapters] = useState<{ seconds: number; title: string }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mediaId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        const res = await getTranscriptStatus(mediaId);
        if (cancelled) return;
        setStatus(res.status);
        if (res.status === 'extracting' || res.status === 'transcribing') timer = setTimeout(check, POLL_MS);
      } catch {
        if (!cancelled) timer = setTimeout(check, POLL_MS * 2);
      }
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mediaId]);

  const suggest = async () => {
    if (!mediaId) return;
    setBusy(true);
    setError(null);
    try {
      const result = await suggestChapters(mediaId);
      setChapters(result);
      if (result.length === 0) setError('This video doesn’t split into 3 or more chapters.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!mediaId) {
    return <p className="mt-2 text-xs text-outline">Chapters from your video are suggested once the upload finishes.</p>;
  }
  if (status === null || status === 'extracting' || status === 'transcribing') {
    return (
      <p className="mt-2 flex items-center gap-2 text-xs text-outline">
        <Icon icon="svg-spinners:ring-resize" className="w-3.5 h-3.5 text-primary" />
        Listening to your video to suggest chapters. This usually takes a minute or two.
      </p>
    );
  }
  if (status === 'none') return <p className="mt-2 text-xs text-outline">No speech found in this video, so chapters can’t be suggested.</p>;
  if (status === 'failed') return <p className="mt-2 text-xs text-outline">Zetca couldn’t transcribe this video. You can still add chapters by hand.</p>;

  return (
    <div className="mt-3">
      {!chapters?.length ? (
        <button
          type="button"
          onClick={suggest}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-primary-200 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-50 disabled:opacity-60"
        >
          {busy ? <Icon icon="svg-spinners:ring-resize" className="w-3.5 h-3.5" /> : <Icon icon="solar:magic-stick-3-linear" className="w-3.5 h-3.5" />}
          {busy ? 'Reading the transcript…' : 'Suggest chapters from the video'}
        </button>
      ) : (
        <div className="rounded-lg bg-white border border-primary-100 p-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="text-xs font-semibold text-on-surface">{chapters.length} chapters from your video</p>
            <div className="flex gap-3 shrink-0">
              <button type="button" onClick={() => setChapters(null)} className="text-xs font-semibold text-outline hover:text-on-surface">
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  onApply(chapters);
                  setChapters(null);
                }}
                className="text-xs font-semibold text-primary hover:text-primary-700"
              >
                Add to description
              </button>
            </div>
          </div>
          <ol className="mt-2 space-y-1">
            {chapters.map((c) => (
              <li key={c.seconds} className="text-xs text-on-surface">
                <span className="font-semibold tabular-nums">{formatTimestamp(c.seconds)}</span> {c.title}
              </li>
            ))}
          </ol>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-amber-700">{error}</p>}
    </div>
  );
}
