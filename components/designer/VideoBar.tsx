'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import type { DesignDoc } from '@/lib/design/types';
import { QUALITY_LABEL } from '@/lib/billing/aiModels';
import { getDownloadUrl } from '@/lib/api/mediaClient';
import { makeHd, type AiProgress } from './ai';
import { useAiCredits } from './AiCredits';

type Video = NonNullable<DesignDoc['video']>;

/**
 * Above the canvas for an AI video: watch the clip, and for a 480p draft,
 * make it in HD (the same frame, prompt and seed, at a higher resolution).
 */
export function VideoBar({ video, onVideo }: { video: Video; onVideo: (next: Video) => void }) {
  const { credits, tier, models } = useAiCredits();
  const [watching, setWatching] = useState<string | null>(null);
  const [progress, setProgress] = useState<AiProgress | null>(null);
  const [error, setError] = useState('');

  const isDraft = video.quality === 'draft' && !!video.jobId;
  // The draft's model is the one with qualities; there's only Wan 3.0 for now
  const options = models?.video.find((m) => m.qualities)?.qualities?.filter((q) => q.id !== 'draft') ?? [];

  const watch = async () => {
    setError('');
    try {
      setWatching((await getDownloadUrl(video.mediaId)).downloadUrl);
    } catch {
      setError('Couldn’t load the video');
    }
  };

  const hd = async (quality: 'hd' | 'full_hd') => {
    setError('');
    try {
      const job = await makeHd(video.jobId!, quality, setProgress);
      if (!job.mediaId) throw new Error('No video came back');
      onVideo({ ...video, mediaId: job.mediaId, jobId: job.jobId, quality });
      setWatching(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t make the HD version');
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white border border-[#E2E8F0] px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0B1C30]">
        <Icon icon="lucide:clapperboard" className="w-4 h-4 text-primary" aria-hidden />
        AI video · {video.durationSeconds}s
        {video.quality && <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${isDraft ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{QUALITY_LABEL[video.quality]}</span>}
      </span>
      <button type="button" onClick={watch} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-primary hover:bg-primary-50">
        <Icon icon="lucide:play" className="w-4 h-4" aria-hidden /> Watch
      </button>
      {isDraft && (
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {progress ? (
            <span role="status" className="inline-flex items-center gap-2 text-sm text-[#464555]">
              <Icon icon="lucide:loader-circle" className="w-4 h-4 animate-spin text-primary" aria-hidden /> Making it in HD… about a minute or two
            </span>
          ) : (
            <>
              <span className="text-xs text-[#777587]">Like it? Make it sharper:</span>
              {options.map((q) => {
                const locked = q.tier > tier;
                const short = credits !== null && credits.left < q.hdCredits;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={locked || short}
                    title={locked ? 'Needs the Pro plan' : short ? 'Not enough credits' : `The same scene and motion in ${q.label}`}
                    onClick={() => hd(q.id as 'hd' | 'full_hd')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:bg-[#E2E8F0] disabled:text-[#94A3B8] disabled:cursor-not-allowed"
                  >
                    {locked && <Icon icon="lucide:lock" className="w-3.5 h-3.5" aria-hidden />}
                    {q.label} · {q.hdCredits} credits
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="w-full text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      {watching && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="AI video" onClick={() => setWatching(null)}>
          <div className="relative max-h-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <video src={watching} controls autoPlay playsInline className="max-h-[80vh] max-w-full rounded-xl bg-black" />
            <p className="mt-2 text-center text-xs text-white/80">The clip on its own. Your words go on top when you download or post it.</p>
            <button type="button" onClick={() => setWatching(null)} aria-label="Close" className="absolute -top-3 -right-3 rounded-full bg-white p-1.5 text-[#0B1C30] shadow">
              <Icon icon="lucide:x" className="w-4 h-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
