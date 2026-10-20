'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import type { YouTubeVideoRecord } from '@/lib/models/youtubeVideo';

/** Shown once a video is saved: Zetca now uploads it to YouTube */
export function ScheduledView({
  video,
  channelTitle,
  thumbnailUrl,
  publishLabel,
  onAnother,
}: {
  video: YouTubeVideoRecord;
  channelTitle?: string;
  /** The local video, used as a preview */
  thumbnailUrl: string;
  publishLabel: string | null;
  onAnother: () => void;
}) {
  return (
    <div className="max-w-[640px] mx-auto bg-white rounded-2xl border border-[#c7c4d8]/25 shadow-sm p-6 sm:p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500 flex items-center justify-center">
        <Icon icon="solar:check-read-linear" className="w-8 h-8 text-white" />
      </div>
      <h1 className="mt-5 text-[26px] font-bold font-heading text-on-surface">
        {video.publishAt ? 'Your video is scheduled' : 'Your video is on its way'}
      </h1>
      <p className="mt-2 text-outline">
        {video.publishAt
          ? `It goes public on ${publishLabel}.`
          : 'Zetca uploads it to YouTube next, with the visibility you picked.'}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-left rounded-xl bg-surface-container-low p-4">
        <video src={thumbnailUrl} muted preload="metadata" className="w-40 aspect-video rounded-lg object-cover bg-black shrink-0" />
        <div className="min-w-0">
          <p className="font-semibold text-on-surface line-clamp-2">{video.details.title}</p>
          {channelTitle && <p className="text-sm text-outline mt-0.5">{channelTitle}</p>}
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary">
            <Icon icon="solar:clock-circle-linear" className="w-3.5 h-3.5" />
            Waiting to upload to YouTube
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <a
          href="https://studio.youtube.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#c7c4d8]/50 px-5 py-3 text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary"
        >
          Open YouTube Studio
          <Icon icon="solar:arrow-right-up-linear" className="w-4 h-4" />
        </a>
        <button
          type="button"
          onClick={onAnother}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
        >
          Upload another video
        </button>
      </div>
    </div>
  );
}
