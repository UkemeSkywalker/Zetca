'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { PublicYouTubeVideo } from '@/lib/models/youtubeVideo';
import { getVideo, retryVideo } from '@/lib/api/youtubeApi';

/** Statuses that still change by themselves, so the page keeps checking */
const ACTIVE = new Set(['queued', 'uploading', 'waiting_quota']);
const POLL_MS = 3000;

function formatInstant(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** Shown once a video is saved: follows it on its way to YouTube */
export function ScheduledView({
  video: initial,
  channelTitle,
  preview,
  publishLabel,
  onAnother,
}: {
  video: PublicYouTubeVideo;
  channelTitle?: string;
  /** A picture of the video: the file itself, or YouTube's thumbnail once it's up */
  preview: { type: 'video' | 'image'; url: string } | null;
  publishLabel: string | null;
  onAnother: () => void;
}) {
  const [video, setVideo] = useState(initial);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (!ACTIVE.has(video.status)) return;
    const timer = setTimeout(async () => {
      try {
        setVideo(await getVideo(video.videoId));
      } catch {
        // Keep showing the last status; the next check tries again
        setVideo((v) => ({ ...v }));
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [video]);

  const retry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      setVideo(await retryVideo(video.videoId));
    } catch (err) {
      setRetryError((err as Error).message);
    } finally {
      setRetrying(false);
    }
  };

  const goesPublic = video.publishAt ? publishLabel ?? formatInstant(video.publishAt) : null;
  const studioUrl = video.youtubeVideoId ? `https://studio.youtube.com/video/${video.youtubeVideoId}/edit` : 'https://studio.youtube.com/';
  const pct =
    video.status === 'uploading' && video.totalBytes ? Math.min(99, Math.floor(((video.uploadedBytes ?? 0) / video.totalBytes) * 100)) : null;

  const view = (() => {
    switch (video.status) {
      case 'failed':
        return {
          icon: 'solar:danger-triangle-bold',
          circle: 'bg-red-500',
          title: 'We couldn’t upload your video',
          line: video.error?.message ?? 'Something went wrong uploading to YouTube.',
          pill: { text: 'Failed', cls: 'bg-red-50 text-red-600', icon: 'solar:close-circle-linear' },
        };
      case 'waiting_quota':
        return {
          icon: 'solar:clock-circle-bold',
          circle: 'bg-amber-500',
          title: 'Scheduled for upload tomorrow',
          line: video.publishAt
            ? 'YouTube’s daily upload limit was reached. Zetca uploads it automatically when the limit resets, before your publish time if there’s still time.'
            : 'YouTube’s daily upload limit was reached. Zetca uploads it automatically when the limit resets.',
          pill: { text: 'Waiting to upload', cls: 'bg-amber-50 text-amber-700', icon: 'solar:clock-circle-linear' },
        };
      case 'scheduled':
        return {
          icon: 'solar:check-read-linear',
          circle: 'bg-emerald-500',
          title: 'Your video is scheduled',
          line: `It’s on YouTube as private and goes public on ${goesPublic}.`,
          pill: { text: 'Scheduled on YouTube', cls: 'bg-primary-50 text-primary', icon: 'solar:calendar-mark-linear' },
        };
      case 'published':
        return {
          icon: 'solar:check-read-linear',
          circle: 'bg-emerald-500',
          title: 'Your video is on YouTube',
          line:
            video.details.privacyStatus === 'public' || video.publishAt
              ? 'It’s live. YouTube may take a few minutes to finish processing it.'
              : `It’s up as ${video.details.privacyStatus}. YouTube may take a few minutes to finish processing it.`,
          pill: { text: 'On YouTube', cls: 'bg-emerald-50 text-emerald-700', icon: 'solar:play-circle-linear' },
        };
      case 'uploading':
        return {
          icon: 'solar:upload-minimalistic-bold',
          circle: 'bg-primary',
          title: 'Uploading to YouTube',
          line: goesPublic ? `It goes public on ${goesPublic}.` : 'It goes up as soon as the upload finishes.',
          pill: { text: pct !== null ? `Uploading… ${pct}%` : 'Uploading…', cls: 'bg-primary-50 text-primary', icon: 'svg-spinners:ring-resize' },
        };
      default:
        return {
          icon: 'solar:upload-minimalistic-bold',
          circle: 'bg-primary',
          title: 'Sending your video to YouTube',
          line: video.error?.code === 'retrying'
            ? 'YouTube had a temporary problem, so Zetca will try again in a few minutes. You can leave this page.'
            : 'The upload is starting now. This page updates by itself, and you can leave it: Zetca keeps uploading in the background.',
          pill: { text: 'Starting upload…', cls: 'bg-primary-50 text-primary', icon: 'svg-spinners:ring-resize' },
        };
    }
  })();

  const needsReconnect = video.status === 'failed' && (video.error?.code === 'reconnect' || video.error?.code === 'no_channel');

  return (
    <div className="max-w-[640px] mx-auto bg-white rounded-2xl border border-[#c7c4d8]/25 shadow-sm p-6 sm:p-10 text-center" aria-live="polite">
      <div className={`w-14 h-14 mx-auto rounded-full ${view.circle} flex items-center justify-center`}>
        <Icon icon={view.icon} className="w-8 h-8 text-white" />
      </div>
      <h1 className="mt-5 text-[26px] font-bold font-heading text-on-surface">{view.title}</h1>
      <p className="mt-2 text-outline">{view.line}</p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 text-left rounded-xl bg-surface-container-low p-4">
        {preview?.type === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.url} alt="" className="w-40 aspect-video rounded-lg object-cover bg-black shrink-0" />
        ) : preview ? (
          <video src={preview.url} muted preload="metadata" className="w-40 aspect-video rounded-lg object-cover bg-black shrink-0" />
        ) : (
          <div className="w-40 aspect-video rounded-lg bg-slate-200 shrink-0" />
        )}
        <div className="min-w-0">
          <p className="font-semibold text-on-surface line-clamp-2">{video.details.title}</p>
          {channelTitle && <p className="text-sm text-outline mt-0.5">{channelTitle}</p>}
          <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${view.pill.cls}`}>
            <Icon icon={view.pill.icon} className="w-3.5 h-3.5" />
            {view.pill.text}
          </span>
        </div>
      </div>

      {video.warnings && video.warnings.length > 0 && (
        <ul className="mt-5 space-y-2 text-left">
          {video.warnings.map((w) => (
            <li key={w} className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <Icon icon="solar:info-circle-linear" className="w-4 h-4 mt-0.5 shrink-0" />
              {w}
            </li>
          ))}
        </ul>
      )}
      {retryError && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {retryError}
        </p>
      )}

      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        {video.status === 'failed' ? (
          <>
            {needsReconnect && (
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center justify-center rounded-xl bg-white border border-[#c7c4d8]/50 px-5 py-3 text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary"
              >
                Reconnect YouTube
              </Link>
            )}
            <button
              type="button"
              onClick={retry}
              disabled={retrying}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {retrying && <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" />}
              Retry upload
            </button>
          </>
        ) : (
          <>
            <a
              href={studioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white border border-[#c7c4d8]/50 px-5 py-3 text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary"
            >
              {video.youtubeVideoId ? 'View in YouTube Studio' : 'Open YouTube Studio'}
              <Icon icon="solar:arrow-right-up-linear" className="w-4 h-4" />
            </a>
            <button
              type="button"
              onClick={onAnother}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Upload another video
            </button>
          </>
        )}
      </div>
    </div>
  );
}
