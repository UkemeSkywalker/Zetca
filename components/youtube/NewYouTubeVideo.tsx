'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import type { MediaRecord } from '@/types/media';
import { MAX_YOUTUBE_VIDEO_SIZE, YOUTUBE_VIDEO_CONTENT_TYPES } from '@/types/media';
import {
  isShort,
  readVideoMetadata,
  uploadVideo,
  type UploadProgress,
  type VideoMetadata,
} from '@/lib/api/videoUploadClient';
import type { YouTubeConnection } from '@/types/user';

const PAGE_PATH = '/dashboard/scheduler/youtube/new';
const CARD = 'bg-white rounded-2xl border border-[#c7c4d8]/25 shadow-sm';

type Upload =
  | { state: 'idle' }
  | { state: 'uploading'; file: File; previewUrl: string; meta: VideoMetadata; progress: UploadProgress }
  | { state: 'done'; file: File; previewUrl: string; meta: VideoMetadata; media: MediaRecord }
  | { state: 'failed'; file: File; previewUrl: string; meta: VideoMetadata; error: string };

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatDuration(seconds?: number): string | null {
  if (!seconds) return null;
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${rest}` : `${m}:${rest}`;
}

/** Why a file can't be uploaded, or null when it can */
export function fileProblem(file: File): string | null {
  if (!(YOUTUBE_VIDEO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Choose an MP4, MOV or WebM video.';
  }
  if (file.size > MAX_YOUTUBE_VIDEO_SIZE) return 'Videos must be 10 GB or smaller.';
  if (file.size === 0) return 'This file is empty.';
  return null;
}

export function NewYouTubeVideo() {
  const [channel, setChannel] = useState<YouTubeConnection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [upload, setUpload] = useState<Upload>({ state: 'idle' });
  const [pickError, setPickError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your account');
        const data = await res.json();
        if (!cancelled) setChannel(data.user?.youtube ?? { isConnected: false });
      })
      .catch((err) => !cancelled && setLoadError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Cancel a running upload and free the preview when leaving the page
  const previewUrl = upload.state === 'idle' ? null : upload.previewUrl;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Warn before closing the tab mid-upload
  useEffect(() => {
    if (upload.state !== 'uploading') return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [upload.state]);

  const start = useCallback(async (file: File) => {
    const problem = fileProblem(file);
    if (problem) {
      setPickError(problem);
      return;
    }
    setPickError(null);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const meta = await readVideoMetadata(file);
    const url = URL.createObjectURL(file);
    const base = { file, previewUrl: url, meta };
    setUpload({ state: 'uploading', ...base, progress: { uploadedBytes: 0, totalBytes: file.size } });

    try {
      const media = await uploadVideo(file, {
        metadata: meta,
        signal: controller.signal,
        onProgress: (progress) =>
          !controller.signal.aborted && setUpload({ state: 'uploading', ...base, progress }),
      });
      if (!controller.signal.aborted) setUpload({ state: 'done', ...base, media });
    } catch (error) {
      if (controller.signal.aborted) return;
      setUpload({ state: 'failed', ...base, error: (error as Error).message || 'The upload failed' });
    }
  }, []);

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUpload({ state: 'idle' });
  };

  if (loadError) {
    return <p className="text-sm text-red-600">{loadError}. Refresh the page to try again.</p>;
  }
  if (!channel) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-10 w-72 rounded-xl bg-white/70 animate-pulse" />
        <div className="h-80 rounded-2xl bg-white/70 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-bold font-heading text-on-surface tracking-tight">New YouTube video</h1>
        {channel.isConnected && <ChannelChip channel={channel} />}
      </header>

      {!channel.isConnected ? (
        <ConnectCard />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
          <div className="min-w-0">
            {upload.state === 'idle' ? (
              <DropZone onFile={start} error={pickError} />
            ) : (
              <PreviewCard upload={upload} onReplace={start} error={pickError} />
            )}
          </div>
          <aside className="space-y-6 lg:sticky lg:top-24">
            <YourVideoCard upload={upload} onCancel={cancel} onRetry={() => upload.state === 'failed' && start(upload.file)} />
            <PublishSummaryCard uploading={upload.state === 'uploading'} />
          </aside>
        </div>
      )}
    </div>
  );
}

function ChannelChip({ channel }: { channel: YouTubeConnection }) {
  const initials = (channel.channelTitle || 'YT')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 bg-white rounded-full pl-1.5 pr-4 py-1.5 shadow-sm border border-[#c7c4d8]/25">
      {channel.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={channel.thumbnailUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center">
          {initials}
        </span>
      )}
      <span className="text-sm font-medium text-on-surface">{channel.channelTitle}</span>
      <Link href="/dashboard/profile" className="text-xs font-semibold text-primary hover:text-primary-700">
        Change
      </Link>
    </div>
  );
}

function ConnectCard() {
  const points = [
    { icon: 'solar:clapperboard-play-linear', text: 'Upload Shorts and long videos' },
    { icon: 'solar:tuning-2-linear', text: 'Set every YouTube detail in one place' },
    { icon: 'solar:calendar-mark-linear', text: 'YouTube publishes at the time you choose' },
  ];
  return (
    <div className={`${CARD} max-w-[700px] mx-auto px-6 sm:px-14 py-12 text-center`}>
      <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center">
        <Icon icon="mdi:youtube" className="w-10 h-10 text-[#FF0000]" />
      </div>
      <h2 className="mt-6 text-2xl font-bold font-heading text-on-surface">Connect your YouTube channel</h2>
      <p className="mt-2 text-outline">Upload and schedule videos straight from Zetca.</p>
      <ul className="mt-8 space-y-3 text-left">
        {points.map((p) => (
          <li key={p.text} className="flex items-center gap-4 rounded-xl bg-primary-50/70 px-5 py-4">
            <span className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Icon icon={p.icon} className="w-5 h-5 text-primary" />
            </span>
            <span className="text-sm font-medium text-on-surface">{p.text}</span>
          </li>
        ))}
      </ul>
      <a
        href={`/api/auth/youtube?return=${encodeURIComponent(PAGE_PATH)}`}
        className="mt-8 flex items-center justify-center gap-2 w-full rounded-xl bg-primary hover:bg-primary-700 text-white font-semibold py-4 transition-colors"
      >
        <Icon icon="solar:link-round-angle-linear" className="w-5 h-5" />
        Connect YouTube
      </a>
      <p className="mt-4 text-xs text-outline">You&apos;ll sign in with Google. You can disconnect any time in Profile.</p>
    </div>
  );
}

function useFilePicker(onFile: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={YOUTUBE_VIDEO_CONTENT_TYPES.join(',')}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (file) onFile(file);
      }}
    />
  );
  return { input, open: () => inputRef.current?.click() };
}

function DropZone({ onFile, error }: { onFile: (file: File) => void; error: string | null }) {
  const [dragging, setDragging] = useState(false);
  const picker = useFilePicker(onFile);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFile(file);
      }}
      className={`rounded-2xl border-2 border-dashed bg-white px-6 py-20 text-center transition-colors ${
        dragging ? 'border-primary bg-primary-50/60' : 'border-[#c7c4d8]'
      }`}
    >
      {picker.input}
      <div className="w-20 h-20 mx-auto rounded-full bg-primary-50 flex items-center justify-center">
        <Icon icon="solar:cloud-upload-linear" className="w-9 h-9 text-primary" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold font-heading text-on-surface">Drag and drop a video file</h2>
      <div className="mt-5 flex items-center justify-center gap-3">
        <span className="text-outline">or</span>
        <button
          type="button"
          onClick={picker.open}
          className="rounded-xl bg-white px-6 py-3 font-semibold text-on-surface shadow-sm border border-[#c7c4d8]/40 hover:border-primary/40 hover:text-primary transition-colors"
        >
          Select file
        </button>
      </div>
      <p className="mt-6 text-sm text-outline">
        MP4, MOV or WebM, up to 10 GB. Vertical videos under 3 minutes become Shorts.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

function PreviewCard({
  upload,
  onReplace,
  error,
}: {
  upload: Exclude<Upload, { state: 'idle' }>;
  onReplace: (file: File) => void;
  error: string | null;
}) {
  const picker = useFilePicker(onReplace);
  const short = isShort(upload.meta);
  return (
    <section className={`${CARD} p-6`}>
      {picker.input}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold font-heading text-on-surface">Preview</h2>
          <p className="text-sm text-outline">Check this is the right video. The details come next.</p>
        </div>
        <button
          type="button"
          onClick={picker.open}
          className="text-sm font-semibold text-primary hover:text-primary-700 flex items-center gap-1.5"
        >
          <Icon icon="solar:refresh-linear" className="w-4 h-4" />
          Replace video
        </button>
      </div>
      <div className={`mt-5 rounded-xl bg-[#0b1220] overflow-hidden flex justify-center ${short ? 'max-h-[360px] sm:max-h-[560px]' : ''}`}>
        <video
          src={upload.previewUrl}
          controls
          preload="metadata"
          className={short ? 'h-[360px] sm:h-[560px] w-auto' : 'w-full aspect-video'}
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}

function YourVideoCard({
  upload,
  onCancel,
  onRetry,
}: {
  upload: Upload;
  onCancel: () => void;
  onRetry: () => void;
}) {
  if (upload.state === 'idle') {
    return (
      <section className={`${CARD} p-6`}>
        <h2 className="text-lg font-semibold font-heading text-on-surface">Your video</h2>
        <div className="mt-5 rounded-xl border border-dashed border-primary-200 bg-primary-50/50 py-12 flex flex-col items-center gap-2 text-outline">
          <Icon icon="solar:clapperboard-linear" className="w-8 h-8 text-primary-300" />
          <span className="text-sm">No video yet</span>
        </div>
      </section>
    );
  }

  const { file, meta } = upload;
  const pct =
    upload.state === 'uploading'
      ? Math.min(99, Math.floor((upload.progress.uploadedBytes / upload.progress.totalBytes) * 100))
      : 100;
  const format = isShort(meta) ? 'Short' : 'Long video';
  const duration = formatDuration(meta.durationSeconds);

  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-lg font-semibold font-heading text-on-surface">Your video</h2>

      <div className="mt-5 rounded-xl bg-primary-50/70 p-4">
        {upload.state === 'uploading' && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-on-surface">Uploading…</span>
              <span className="font-semibold text-primary">{pct}%</span>
            </div>
            <div
              className="mt-2 h-2 rounded-full bg-primary-100 overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Upload progress"
            >
              <div className="h-full bg-primary rounded-full transition-[width] duration-300" style={{ width: `${pct}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-outline">
              <span>
                {formatBytes(upload.progress.uploadedBytes)} of {formatBytes(file.size)}
              </span>
              <button type="button" onClick={onCancel} className="font-semibold text-outline hover:text-red-600">
                Cancel
              </button>
            </div>
          </>
        )}
        {upload.state === 'done' && (
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Icon icon="solar:check-circle-bold" className="w-5 h-5" />
            Uploaded to Zetca
          </div>
        )}
        {upload.state === 'failed' && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm text-red-700">
              <Icon icon="solar:danger-circle-bold" className="w-5 h-5 shrink-0" />
              <span>{upload.error}</span>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                Try again
              </button>
              <button type="button" onClick={onCancel} className="text-sm font-semibold text-outline hover:text-on-surface">
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="sr-only">File</dt>
          <dd className="font-medium text-on-surface truncate" title={file.name}>
            {file.name}
          </dd>
          <dd className="text-outline shrink-0">{formatBytes(file.size)}</dd>
        </div>
        <div className="flex justify-between gap-4 text-outline">
          <dt>Format</dt>
          <dd className="text-on-surface">
            {format}
            {duration && <span className="text-outline"> · {duration}</span>}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function PublishSummaryCard({ uploading }: { uploading: boolean }) {
  return (
    <section className={`${CARD} p-6`}>
      <h2 className="text-lg font-semibold font-heading text-on-surface">Publish summary</h2>
      <button
        type="button"
        disabled
        className="mt-5 w-full rounded-xl bg-primary-100 py-4 font-semibold text-white cursor-not-allowed"
      >
        Schedule video
      </button>
      <p className="mt-3 text-center text-xs text-outline">
        {uploading ? 'Available when the upload finishes' : 'Add the video details to schedule it'}
      </p>
    </section>
  );
}
