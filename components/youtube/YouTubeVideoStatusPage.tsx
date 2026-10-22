'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { getVideo, removeVideo, videoToPost } from '@/lib/api/youtubeApi';
import { canEdit, removeCopy } from '@/lib/content/itemActions';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getDownloadUrl } from '@/lib/api/mediaClient';
import type { PublicYouTubeVideo } from '@/lib/models/youtubeVideo';
import { ScheduledView } from './ScheduledView';

/** A scheduled YouTube video's status, opened from the Scheduler or Publisher */
export function YouTubeVideoStatusPage({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [video, setVideo] = useState<PublicYouTubeVideo | null>(null);
  const [channelTitle, setChannelTitle] = useState<string | undefined>();
  const [preview, setPreview] = useState<{ type: 'video' | 'image'; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; warnings: string[] } | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await getVideo(videoId);
        if (cancelled) return;
        setVideo(v);
        // "Saved" message after coming back from the edit page
        const params = new URLSearchParams(window.location.search);
        if (params.has('saved') || params.has('saved-youtube')) {
          setNotice({
            text: params.has('saved-youtube') ? 'Saved to YouTube.' : 'Changes saved.',
            warnings: (params.get('warnings') ?? '').split('\n').filter(Boolean),
          });
          window.history.replaceState(null, '', window.location.pathname);
        }
        if (v.youtubeVideoId) {
          setPreview({ type: 'image', url: `https://i.ytimg.com/vi/${encodeURIComponent(v.youtubeVideoId)}/mqdefault.jpg` });
        } else {
          getDownloadUrl(v.mediaId)
            .then((res) => !cancelled && setPreview({ type: 'video', url: res.downloadUrl }))
            .catch(() => {});
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    })();
    fetch('/api/profile', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => !cancelled && setChannelTitle(data?.user?.youtube?.channelTitle))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return (
    <div className="space-y-6">
      <Link href="/dashboard/scheduler" className="inline-flex items-center gap-1.5 text-sm font-semibold text-outline hover:text-primary">
        <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
        Back to Scheduler
      </Link>
      {notice && (
        <div role="status" className="max-w-[640px] mx-auto rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <p className="flex items-center gap-2 font-medium">
            <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
            {notice.text}
          </p>
          {notice.warnings.map((w) => (
            <p key={w} className="mt-1 text-amber-800">
              {w}
            </p>
          ))}
        </div>
      )}
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : !video ? (
        <div className="max-w-[640px] mx-auto h-80 rounded-2xl bg-white/70 animate-pulse" aria-busy="true" />
      ) : (
        <ScheduledView
          video={video}
          channelTitle={channelTitle}
          preview={preview}
          publishLabel={null}
          onAnother={() => router.push('/dashboard/scheduler/youtube/new')}
        />
      )}
      {video && (() => {
        const item = videoToPost(video);
        const copy = removeCopy(item);
        return (
          <>
            <div className="max-w-[640px] mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {canEdit(item) && (
                <Link
                  href={`/dashboard/scheduler/youtube/${encodeURIComponent(video.videoId)}/edit`}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary-700"
                >
                  <Icon icon="solar:pen-linear" className="w-4 h-4" />
                  Edit details
                </Link>
              )}
              {video.status !== 'uploading' && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"
                >
                  <Icon icon="solar:trash-bin-trash-linear" className="w-4 h-4" />
                  {copy.menuLabel}
                </button>
              )}
            </div>
            <ConfirmDialog
              open={confirming}
              title={copy.title}
              message={<p>{copy.message}</p>}
              confirmLabel={copy.confirmLabel}
              onClose={() => setConfirming(false)}
              onConfirm={async () => {
                await removeVideo(video.videoId);
                router.push('/dashboard/scheduler');
              }}
            />
          </>
        );
      })()}
    </div>
  );
}
