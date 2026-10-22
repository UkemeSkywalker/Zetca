'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { getOptions, getVideo, updateVideo, videoPagePath, type YouTubeRequestError } from '@/lib/api/youtubeApi';
import type { PublicYouTubeVideo } from '@/lib/models/youtubeVideo';
import { draftFromDetails, draftToInput, sectionForField, validateDraft, type DetailsDraft } from '@/lib/youtube/draft';
import { VideoDetailsForm, SECTIONS, type FormOptions } from './VideoDetailsForm';
import { allTimeZones, browserTimeZone } from './NewYouTubeVideo';

/** Edit a scheduled or published YouTube video; once it's on YouTube, saving updates YouTube too */
export function EditYouTubeVideo({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [video, setVideo] = useState<PublicYouTubeVideo | null>(null);
  const [draft, setDraft] = useState<DetailsDraft | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [options, setOptions] = useState<FormOptions>({ playlists: [], categories: [], loading: true, error: null });
  const timeZone = useMemo(browserTimeZone, []);
  const timeZones = useMemo(() => allTimeZones(timeZone), [timeZone]);

  useEffect(() => {
    let cancelled = false;
    getVideo(videoId)
      .then((v) => {
        if (cancelled) return;
        setVideo(v);
        setDraft(draftFromDetails(v.details, timeZone));
      })
      .catch((err) => !cancelled && setLoadError((err as Error).message));
    getOptions()
      .then((o) => !cancelled && setOptions({ ...o, loading: false, error: null }))
      .catch((err) => !cancelled && setOptions({ playlists: [], categories: [], loading: false, error: (err as Error).message }));
    return () => {
      cancelled = true;
    };
  }, [videoId, timeZone]);

  const update = useCallback((patch: Partial<DetailsDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d)), []);

  const jumpTo = (section: string) => document.getElementById(`section-${section}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const save = async () => {
    if (!draft || !video) return;
    setSaveError(null);
    const found = validateDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) {
      setSaveError('Fix the highlighted details first.');
      jumpTo(sectionForField(Object.keys(found)[0]));
      return;
    }
    setSaving(true);
    try {
      const { warnings } = await updateVideo(videoId, draftToInput(draft));
      const note = video.youtubeVideoId ? 'saved-youtube' : 'saved';
      const query = new URLSearchParams({ [note]: '1', ...(warnings.length ? { warnings: warnings.join('\n') } : {}) });
      router.push(`${videoPagePath(videoId)}?${query}`);
    } catch (err) {
      const e = err as YouTubeRequestError;
      setSaveError(e.message);
      if (e.fields && Object.keys(e.fields).length) {
        setErrors(e.fields);
        jumpTo(sectionForField(Object.keys(e.fields)[0]));
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <p className="text-sm text-red-600">{loadError}</p>;
  if (!video || !draft) return <div className="h-80 rounded-2xl bg-white/70 animate-pulse" aria-busy="true" />;
  if (video.status === 'uploading') {
    return (
      <p className="text-sm text-outline">
        This video is uploading to YouTube right now. <Link href={videoPagePath(videoId)} className="text-primary font-semibold">See its progress</Link>
      </p>
    );
  }

  const onYouTube = !!video.youtubeVideoId;
  const saveBar = (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
      >
        {saving && <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" />}
        {onYouTube ? 'Save to YouTube' : 'Save changes'}
      </button>
      <Link href={videoPagePath(videoId)} className="text-center text-sm font-semibold text-outline hover:text-on-surface">
        Cancel
      </Link>
      {saveError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {saveError}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 pb-28 lg:pb-0 max-w-4xl">
      <Link href={videoPagePath(videoId)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-outline hover:text-primary">
        <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
        Back to the video
      </Link>
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-on-surface tracking-tight">Edit video details</h1>
        <p className="text-sm text-outline">
          {onYouTube
            ? 'Changes are saved to YouTube too. Anything you changed in YouTube Studio and don’t change here stays as it is. The video file itself can’t be replaced.'
            : 'The video hasn’t gone to YouTube yet, so it uploads with these details.'}
        </p>
      </header>

      <nav aria-label="Form sections" className="sticky top-16 lg:top-20 z-10 -mx-1 px-1 py-2 flex gap-2 overflow-x-auto bg-surface/90 backdrop-blur">
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
        file={null}
        isShort={video.isShort}
        options={options}
        onPlaylistCreated={(p) => setOptions((o) => ({ ...o, playlists: [p, ...o.playlists] }))}
        timeZones={timeZones}
        mediaId={video.mediaId}
        published={video.status === 'published'}
      />

      <div className="hidden lg:block">{saveBar}</div>
      {/* Phones: a save bar at the bottom */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-[#c7c4d8]/40 bg-white/95 backdrop-blur px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        {saveBar}
      </div>
    </div>
  );
}
