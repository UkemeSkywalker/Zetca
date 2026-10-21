'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { getOptions, scheduleVideo, YouTubeRequestError } from '@/lib/api/youtubeApi';
import type { PublicYouTubeVideo } from '@/lib/models/youtubeVideo';
import { draftToInput, newDraft, sectionForField, titleFromFilename, validateDraft, type DetailsDraft } from '@/lib/youtube/draft';
import { defaultLanguage } from '@/lib/youtube/languages';
import type { YouTubeConnection } from '@/types/user';
import { VideoDetailsForm, SECTIONS, type FormOptions } from './VideoDetailsForm';
import { ScheduledView } from './ScheduledView';
import { CARD } from './formKit';

const PAGE_PATH = '/dashboard/scheduler/youtube/new';

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

/** "Thu, 23 Oct, 6:00 PM (WAT)" */
export function formatPublishTime(draft: Pick<DetailsDraft, 'scheduledDate' | 'scheduledTime' | 'timeZone'>): string {
  const [y, m, d] = draft.scheduledDate.split('-').map(Number);
  const [hh, mm] = draft.scheduledTime.split(':').map(Number);
  if (!y || Number.isNaN(hh)) return '—';
  const day = new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
  const time = new Date(Date.UTC(2000, 0, 1, hh, mm)).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
  let zone = draft.timeZone;
  try {
    zone =
      new Intl.DateTimeFormat('en-US', { timeZone: draft.timeZone, timeZoneName: 'short' })
        .formatToParts(new Date(Date.UTC(y, m - 1, d, hh, mm)))
        .find((p) => p.type === 'timeZoneName')?.value ?? draft.timeZone;
  } catch {
    /* unknown zone: show its name */
  }
  return `${day}, ${time} (${zone})`;
}

function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function allTimeZones(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];
  } catch {
    zones = [];
  }
  if (!zones.includes(current)) zones = [current, ...zones];
  return zones.length ? zones : ['UTC'];
}

export function NewYouTubeVideo() {
  const [channel, setChannel] = useState<YouTubeConnection | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [upload, setUpload] = useState<Upload>({ state: 'idle' });
  const [pickError, setPickError] = useState<string | null>(null);
  const [draft, setDraft] = useState<DetailsDraft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scheduled, setScheduled] = useState<PublicYouTubeVideo | null>(null);
  const [options, setOptions] = useState<FormOptions>({ playlists: [], categories: [], loading: true, error: null });
  const abortRef = useRef<AbortController | null>(null);
  const attemptedRef = useRef(false);
  const uploadRef = useRef<Upload>(upload);
  useEffect(() => {
    uploadRef.current = upload;
  }, [upload]);
  const timeZone = useMemo(browserTimeZone, []);
  const timeZones = useMemo(() => allTimeZones(timeZone), [timeZone]);

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

  // Playlists and categories come from the connected channel
  useEffect(() => {
    if (!channel?.isConnected) return;
    let cancelled = false;
    getOptions()
      .then((o) => !cancelled && setOptions({ ...o, loading: false, error: null }))
      .catch((err) => !cancelled && setOptions({ playlists: [], categories: [], loading: false, error: (err as Error).message }));
    return () => {
      cancelled = true;
    };
  }, [channel?.isConnected]);

  // Cancel a running upload and free the preview when leaving the page
  const previewUrl = upload.state === 'idle' ? null : upload.previewUrl;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  useEffect(() => () => abortRef.current?.abort(), []);

  // Warn before closing the tab with work that isn't scheduled yet
  const unsaved = upload.state !== 'idle' && !scheduled;
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const start = useCallback(
    async (file: File) => {
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
      // Replacing the video keeps the details, but not the old video's thumbnail or an untouched title
      const prev = uploadRef.current;
      setDraft((d) => {
        if (!d) {
          const language = defaultLanguage(typeof navigator !== 'undefined' ? navigator.language : undefined);
          return newDraft(file.name, { language, timeZone });
        }
        const autoTitle = prev.state !== 'idle' && d.title === titleFromFilename(prev.file.name);
        return { ...d, thumbnailMediaId: undefined, ...(autoTitle ? { title: titleFromFilename(file.name) } : {}) };
      });
      setUpload({ state: 'uploading', ...base, progress: { uploadedBytes: 0, totalBytes: file.size } });

      try {
        const media = await uploadVideo(file, {
          metadata: meta,
          signal: controller.signal,
          onProgress: (progress) => !controller.signal.aborted && setUpload({ state: 'uploading', ...base, progress }),
        });
        if (!controller.signal.aborted) setUpload({ state: 'done', ...base, media });
      } catch (error) {
        if (controller.signal.aborted) return;
        setUpload({ state: 'failed', ...base, error: (error as Error).message || 'The upload failed' });
      }
    },
    [timeZone]
  );

  const cancel = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUpload({ state: 'idle' });
  };

  const update = useCallback((patch: Partial<DetailsDraft>) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d, ...patch };
      // After a failed attempt, errors update as fields are fixed
      if (attemptedRef.current) {
        const found = validateDraft(next);
        setErrors(found);
        if (Object.keys(found).length === 0) setSubmitError(null);
      }
      return next;
    });
  }, []);

  const jumpTo = (section: string) =>
    document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const submit = async () => {
    if (!draft || upload.state !== 'done') return;
    attemptedRef.current = true;
    setSubmitError(null);
    const found = validateDraft(draft);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      setSubmitError('Fix the highlighted details first.');
      jumpTo(sectionForField(first));
      return;
    }
    setSubmitting(true);
    try {
      const video = await scheduleVideo(upload.media.mediaId, draftToInput(draft));
      setScheduled(video);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const e = err as YouTubeRequestError;
      setSubmitError(e.message);
      if (e.fields && Object.keys(e.fields).length) {
        setErrors(e.fields);
        jumpTo(sectionForField(Object.keys(e.fields)[0]));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    abortRef.current = null;
    attemptedRef.current = false;
    setUpload({ state: 'idle' });
    setDraft(null);
    setErrors({});
    setSubmitError(null);
    setScheduled(null);
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

  if (scheduled && upload.state === 'done') {
    return (
      <ScheduledView
        video={scheduled}
        channelTitle={channel.channelTitle}
        thumbnailUrl={upload.previewUrl}
        publishLabel={scheduled.publishAt && draft ? formatPublishTime(draft) : null}
        onAnother={reset}
      />
    );
  }

  const short = upload.state !== 'idle' && isShort(upload.meta);

  return (
    <div className="space-y-6 pb-28 lg:pb-0">
      <header className="flex flex-wrap items-center gap-3 sm:gap-4">
        <h1 className="sr-only">Upload a YouTube video</h1>
        {draft && (
          <span className="rounded-full bg-white border border-[#c7c4d8]/40 px-3 py-1 text-xs font-semibold text-outline">● Draft</span>
        )}
        {channel.isConnected && <ChannelChip channel={channel} />}
      </header>

      {!channel.isConnected ? (
        <ConnectCard />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 lg:gap-8 items-start">
          {upload.state !== 'idle' && (
            <aside className="space-y-6 lg:sticky lg:top-24 lg:order-2">
              <YourVideoCard
                upload={upload}
                onCancel={cancel}
                onRetry={() => upload.state === 'failed' && start(upload.file)}
                onReplace={start}
                pickError={pickError}
              />
              {draft && (
                <PublishSummaryCard
                  draft={draft}
                  ready={upload.state === 'done'}
                  submitting={submitting}
                  error={submitError}
                  onSchedule={submit}
                  className="hidden lg:block"
                />
              )}
            </aside>
          )}
          <div className="min-w-0 lg:order-1">
            {upload.state === 'idle' || !draft ? (
              <DropZone onFile={start} error={pickError} />
            ) : (
              <>
                <nav
                  aria-label="Form sections"
                  className="sticky top-16 lg:top-20 z-10 -mx-1 px-1 py-2 mb-4 flex gap-2 overflow-x-auto bg-surface/90 backdrop-blur"
                >
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => jumpTo(s.id)}
                      className="shrink-0 rounded-full bg-white border border-[#c7c4d8]/40 px-4 py-1.5 text-sm font-medium text-on-surface hover:border-primary/40 hover:text-primary"
                    >
                      {s.label}
                    </button>
                  ))}
                </nav>
                <VideoDetailsForm
                  draft={draft}
                  update={update}
                  errors={errors}
                  file={upload.file}
                  isShort={short}
                  durationSeconds={upload.meta.durationSeconds}
                  options={options}
                  onPlaylistCreated={(p) => setOptions((o) => ({ ...o, playlists: [p, ...o.playlists] }))}
                  timeZones={timeZones}
                />
              </>
            )}
          </div>
          {upload.state === 'idle' && (
            <aside className="space-y-6 lg:sticky lg:top-24 lg:order-2">
              <EmptyVideoCard />
            </aside>
          )}
        </div>
      )}

      {/* Phones: the summary becomes a bar at the bottom */}
      {channel.isConnected && draft && upload.state !== 'idle' && (
        <MobileScheduleBar draft={draft} ready={upload.state === 'done'} submitting={submitting} error={submitError} onSchedule={submit} />
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


function EmptyVideoCard() {
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

function YourVideoCard({
  upload,
  onCancel,
  onRetry,
  onReplace,
  pickError,
}: {
  upload: Exclude<Upload, { state: 'idle' }>;
  onCancel: () => void;
  onRetry: () => void;
  onReplace: (file: File) => void;
  pickError: string | null;
}) {
  const picker = useFilePicker(onReplace);
  const { file, meta } = upload;
  const short = isShort(meta);
  const pct =
    upload.state === 'uploading'
      ? Math.min(99, Math.floor((upload.progress.uploadedBytes / upload.progress.totalBytes) * 100))
      : 100;
  const duration = formatDuration(meta.durationSeconds);

  return (
    <section className={`${CARD} p-6`}>
      {picker.input}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold font-heading text-on-surface">Your video</h2>
        <button
          type="button"
          onClick={picker.open}
          className="text-xs font-semibold text-primary hover:text-primary-700 flex items-center gap-1"
        >
          <Icon icon="solar:refresh-linear" className="w-3.5 h-3.5" />
          Replace
        </button>
      </div>

      <div className="mt-4 rounded-xl bg-[#0b1220] overflow-hidden flex justify-center">
        <video
          src={upload.previewUrl}
          controls
          preload="metadata"
          className={short ? 'h-[300px] w-auto' : 'w-full aspect-video'}
        />
      </div>

      {upload.state === 'uploading' && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-on-surface">Uploading to Zetca…</span>
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
        </div>
      )}
      {upload.state === 'failed' && (
        <div className="mt-4 rounded-xl bg-red-50 p-4 space-y-3">
          <div className="flex items-start gap-2 text-sm text-red-700">
            <Icon icon="solar:danger-circle-bold" className="w-5 h-5 shrink-0" />
            <span>{upload.error}</span>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onRetry} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700">
              Try again
            </button>
            <button type="button" onClick={onCancel} className="text-sm font-semibold text-outline hover:text-on-surface">
              Remove
            </button>
          </div>
        </div>
      )}

      <dl className="mt-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="sr-only">File</dt>
          <dd className="font-medium text-on-surface truncate" title={file.name}>
            {file.name}
          </dd>
          <dd className="text-outline shrink-0">{formatBytes(file.size)}</dd>
        </div>
        {upload.state === 'done' && (
          <div className="flex items-center gap-1.5 text-emerald-700">
            <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
            <span className="font-medium">Uploaded to Zetca</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-outline">
          <dt>Format:</dt>
          <dd className="flex items-center gap-1.5">
            {short ? (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">Short</span>
            ) : (
              <span className="text-on-surface">Long video</span>
            )}
            {duration && <span>· {duration}</span>}
          </dd>
        </div>
      </dl>
      {pickError && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {pickError}
        </p>
      )}
    </section>
  );
}

function summaryRows(draft: DetailsDraft): { label: string; value: string }[] {
  const visibility = { public: 'Public', unlisted: 'Unlisted', private: 'Private' }[draft.privacyStatus];
  return [
    { label: 'Visibility', value: visibility },
    {
      label: draft.publishMode === 'schedule' ? 'Publishes' : 'Goes up',
      value: draft.publishMode === 'schedule' ? formatPublishTime(draft) : 'As soon as it’s uploaded',
    },
    { label: 'Notify subscribers', value: draft.notifySubscribers ? 'On' : 'Off' },
  ];
}

function scheduleHint(draft: DetailsDraft, ready: boolean): string {
  if (!ready) return 'Available when the upload finishes';
  if (draft.publishMode === 'schedule') return 'Zetca uploads it as private; YouTube makes it public at this time.';
  return 'Zetca uploads it to YouTube straight away.';
}

function PublishSummaryCard({
  draft,
  ready,
  submitting,
  error,
  onSchedule,
  className = '',
}: {
  draft: DetailsDraft;
  ready: boolean;
  submitting: boolean;
  error: string | null;
  onSchedule: () => void;
  className?: string;
}) {
  return (
    <section className={`${CARD} p-6 ${className}`}>
      <h2 className="text-lg font-semibold font-heading text-on-surface">Publish summary</h2>
      <dl className="mt-4 space-y-2.5 text-sm">
        {summaryRows(draft).map((row) => (
          <div key={row.label} className="flex justify-between gap-4">
            <dt className="text-outline">{row.label}</dt>
            <dd className="text-right font-medium text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        onClick={onSchedule}
        disabled={!ready || submitting}
        className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-white hover:bg-primary-700 disabled:bg-primary-100 disabled:cursor-not-allowed transition-colors"
      >
        {submitting && <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" />}
        {draft.publishMode === 'schedule' ? 'Schedule video' : 'Publish video'}
      </button>
      {error ? (
        <p role="alert" className="mt-3 text-center text-xs font-medium text-red-600">
          {error}
        </p>
      ) : (
        <p className="mt-3 text-center text-xs text-outline">{scheduleHint(draft, ready)}</p>
      )}
    </section>
  );
}

function MobileScheduleBar({
  draft,
  ready,
  submitting,
  error,
  onSchedule,
}: {
  draft: DetailsDraft;
  ready: boolean;
  submitting: boolean;
  error: string | null;
  onSchedule: () => void;
}) {
  const when = draft.publishMode === 'schedule' ? `Publishes ${formatPublishTime(draft)}` : 'Publishes as soon as it’s uploaded';
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[#c7c4d8]/40 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <p className={`text-xs mb-2 truncate ${error ? 'text-red-600 font-medium' : 'text-outline'}`}>
        {error ?? (ready ? when : 'Available when the upload finishes')}
      </p>
      <button
        type="button"
        onClick={onSchedule}
        disabled={!ready || submitting}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-semibold text-white disabled:bg-primary-100"
      >
        {submitting && <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" />}
        {draft.publishMode === 'schedule' ? 'Schedule video' : 'Publish video'}
      </button>
    </div>
  );
}
