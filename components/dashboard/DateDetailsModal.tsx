'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScheduledPost } from '@/types/scheduler';
import { getDownloadUrl } from '@/lib/api/mediaClient';

interface DateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  posts: ScheduledPost[];
  onScheduleNew: () => void;
  onEditPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
}

const platformIcons: Record<string, string> = {
  instagram: 'simple-icons:instagram',
  twitter: 'ri:twitter-x-fill',
  x: 'ri:twitter-x-fill',
  linkedin: 'simple-icons:linkedin',
  facebook: 'simple-icons:facebook',
};

const platformColors: Record<string, string> = {
  instagram: '#E4405F',
  twitter: '#000000',
  x: '#000000',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
};

export function DateDetailsModal({
  isOpen,
  onClose,
  selectedDate,
  posts,
  onScheduleNew,
  onEditPost,
  onDeletePost,
}: DateDetailsModalProps) {
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen || posts.length === 0) return;
    const postsWithMedia = posts.filter(p => p.mediaId && !p.mediaUrl);
    if (postsWithMedia.length === 0) return;
    let cancelled = false;
    const fetchUrls = async () => {
      const urls: Record<string, string> = {};
      await Promise.all(
        postsWithMedia.map(async (post) => {
          try {
            const res = await getDownloadUrl(post.mediaId!);
            if (!cancelled) urls[post.mediaId!] = res.downloadUrl;
          } catch { /* skip */ }
        })
      );
      if (!cancelled) setMediaUrls(prev => ({ ...prev, ...urls }));
    };
    fetchUrls();
    return () => { cancelled = true; };
  }, [isOpen, posts]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = 'unset'; };
  }, [isOpen, onClose]);

  if (!isOpen || !selectedDate) return null;

  const getMediaUrl = (post: ScheduledPost): string | undefined =>
    post.mediaUrl || (post.mediaId ? mediaUrls[post.mediaId] : undefined);

  const formatTime = (dateStr: string, timeStr: string) => {
    // Convert UTC stored date/time to local for display
    const d = new Date(`${dateStr}T${timeStr}:00Z`);
    const hour = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const sortedPosts = [...posts].sort((a, b) => {
    const aUtc = `${a.scheduledDate}T${a.scheduledTime}`;
    const bUtc = `${b.scheduledDate}T${b.scheduledTime}`;
    return aUtc.localeCompare(bUtc);
  });
  const uniquePlatforms = new Set(posts.map(p => p.platform));
  const monthShort = selectedDate.toLocaleString('en-US', { month: 'short' });
  const day = selectedDate.getDate();
  const weekday = selectedDate.toLocaleString('en-US', { weekday: 'long' });
  const year = selectedDate.getFullYear();

  const modalContent = (
    <>
      <div
        className="fixed inset-0 bg-on-surface/30 z-40"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative rounded-2xl shadow-ambient-lg w-full max-w-6xl min-h-[600px] max-h-[92vh] flex pointer-events-auto overflow-hidden"
          style={{
            background: 'rgba(246, 246, 255, 0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          role="dialog"
          aria-modal="true"
        >
          {/* Left panel — date summary */}
          <div className="w-80 flex-shrink-0 p-10 flex flex-col border-r border-gray-200/60">
            <p className="text-base font-semibold uppercase tracking-wider text-primary mb-2">Scheduled for</p>
            <h2 className="text-6xl font-bold text-on-surface leading-tight">
              {monthShort} {day}
            </h2>
            <p className="text-lg text-outline mt-1">{weekday}, {year}</p>

            <div className="mt-12 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon icon="solar:calendar-bold" className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-on-surface">{posts.length} {posts.length === 1 ? 'Post' : 'Posts'}</p>
                  <p className="text-base text-outline">Across {uniquePlatforms.size} {uniquePlatforms.size === 1 ? 'platform' : 'platforms'}</p>
                </div>
              </div>

              {sortedPosts.length >= 2 && (
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Icon icon="solar:clock-circle-bold" className="w-6 h-6 text-secondary" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-on-surface">Time Range</p>
                    <p className="text-base text-outline">
                      {formatTime(sortedPosts[0].scheduledDate, sortedPosts[0].scheduledTime)} — {formatTime(sortedPosts[sortedPosts.length - 1].scheduledDate, sortedPosts[sortedPosts.length - 1].scheduledTime)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-auto pt-10">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-lg text-outline hover:text-on-surface transition-colors"
              >
                <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
                Close Details
              </button>
            </div>
          </div>

          {/* Right panel — post pipeline */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-8 pt-8 pb-5">
              <h3 className="text-2xl font-semibold text-on-surface">Today&apos;s Pipeline</h3>
              <button
                onClick={onClose}
                className="text-outline hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-high/50"
                aria-label="Close"
              >
                <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-8 pb-6">
              {sortedPosts.length === 0 ? (
                <div className="text-center py-16">
                  <Icon icon="solar:calendar-bold" className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-outline">No posts scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPosts.map((post) => {
                    const mediaUrl = getMediaUrl(post);
                    return (
                      <div key={post.id} className="group rounded-xl bg-white/60 border border-gray-200/50 p-6 hover:shadow-sm transition-shadow">
                        <div className="flex gap-5">
                          {/* Media thumbnail or platform icon */}
                          <div className="flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                            {mediaUrl && post.mediaType === 'image' ? (
                              <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                            ) : mediaUrl && post.mediaType === 'video' ? (
                              <video src={mediaUrl} className="w-full h-full object-cover" preload="metadata"><track kind="captions" /></video>
                            ) : (
                              <Icon
                                icon={platformIcons[post.platform] || 'solar:chat-round-bold'}
                                className="w-10 h-10"
                                style={{ color: platformColors[post.platform] || '#6B7280' }}
                              />
                            )}
                          </div>

                          {/* Post content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 text-base text-outline">
                                <span className="font-medium">{formatTime(post.scheduledDate, post.scheduledTime)}</span>
                                <span>•</span>
                                <span className="capitalize">{post.platform}</span>
                              </div>
                              <StatusBadge status={post.status} />
                            </div>

                            <p className="text-lg font-medium text-on-surface line-clamp-2 leading-snug mb-2">
                              {post.content.length > 140 ? post.content.substring(0, 140) + '…' : post.content}
                            </p>

                            {post.strategyLabel && (
                              <div className="flex items-center gap-2 mb-3">
                                <span
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: post.strategyColor || '#6B7280' }}
                                />
                                <span className="text-base text-outline">{post.strategyLabel}</span>
                              </div>
                            )}

                            {/* Platform icon + actions */}
                            <div className="flex items-center gap-5">
                              <Icon
                                icon={platformIcons[post.platform] || 'solar:chat-round-bold'}
                                className="w-5 h-5"
                                style={{ color: platformColors[post.platform] || '#6B7280' }}
                              />
                              <button
                                onClick={() => onEditPost(post.id)}
                                className="text-base font-medium text-primary hover:text-primary/80 transition-colors"
                              >
                                Edit Content
                              </button>
                              <button
                                onClick={() => onDeletePost(post.id)}
                                className="text-base font-medium text-red-500 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add another post */}
              <button
                onClick={onScheduleNew}
                className="mt-5 w-full rounded-xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center gap-2 text-outline hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <Icon icon="solar:add-circle-bold" className="w-8 h-8" />
                <span className="text-lg font-medium">Add another post</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
