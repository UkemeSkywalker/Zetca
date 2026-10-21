'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { getVideo } from '@/lib/api/youtubeApi';
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const v = await getVideo(videoId);
        if (cancelled) return;
        setVideo(v);
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
    </div>
  );
}
