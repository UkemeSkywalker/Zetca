'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScheduledPost } from '@/types/scheduler';
import { getDownloadUrl } from '@/lib/api/mediaClient';

interface PostPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: ScheduledPost | null;
  onEdit: (postId: string) => void;
  onDelete: (postId: string) => void;
  onScheduleNew: () => void;
}

const platformIcons: Record<string, string> = {
  instagram: 'simple-icons:instagram',
  twitter: 'ri:twitter-x-fill',
  x: 'ri:twitter-x-fill',
  linkedin: 'simple-icons:linkedin',
  facebook: 'simple-icons:facebook',
};
const platformColors: Record<string, string> = {
  instagram: '#E4405F', twitter: '#000000', x: '#000000', linkedin: '#0A66C2', facebook: '#1877F2',
};

export function PostPreviewModal({ isOpen, onClose, post, onEdit, onDelete, onScheduleNew }: PostPreviewModalProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !post?.mediaId) { setMediaUrl(null); return; }
    let cancelled = false;
    getDownloadUrl(post.mediaId).then(res => { if (!cancelled) setMediaUrl(res.downloadUrl); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen, post?.mediaId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) { document.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = 'unset'; };
  }, [isOpen, onClose]);

  if (!isOpen || !post) return null;

  const formatTime = (dateStr: string, timeStr: string) => {
    const dt = new Date(`${dateStr}T${timeStr}:00Z`);
    const hour = dt.getHours();
    const m = String(dt.getMinutes()).padStart(2, '0');
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  // Convert UTC stored date/time to local for display
  const localDt = new Date(`${post.scheduledDate}T${post.scheduledTime}:00Z`);
  const dateObj = new Date(localDt.getFullYear(), localDt.getMonth(), localDt.getDate());
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-on-surface/30 z-40" style={{ backdropFilter: 'blur(4px)' }} onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative rounded-2xl shadow-ambient-lg w-full max-w-[63vw] min-h-[600px] max-h-[92vh] flex pointer-events-auto overflow-hidden"
          style={{ background: 'rgba(246, 246, 255, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          role="dialog" aria-modal="true"
        >
          {/* LEFT — Social post preview */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200/60 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-3 px-8 pt-8 pb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${platformColors[post.platform] || '#6B7280'}15` }}>
                <Icon icon={platformIcons[post.platform] || 'solar:chat-round-bold'} className="w-5 h-5" style={{ color: platformColors[post.platform] || '#6B7280' }} />
              </div>
              <p className="text-sm font-semibold uppercase tracking-wider text-outline">Post Preview</p>
            </div>

            {/* Social card */}
            <div className="mx-8 mb-8 bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Author */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: post.strategyColor || '#6366F1' }}>
                  <span className="text-base font-bold text-white">{(post.strategyLabel || 'P').charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-on-surface">{post.strategyLabel || 'Post'}</span>
                    <span className="text-sm text-outline">· 1st</span>
                  </div>
                  <p className="text-sm text-outline capitalize">{post.platform}</p>
                </div>
              </div>

              {/* Content */}
              <div className="px-5 pb-4">
                <p className="text-base text-on-surface leading-relaxed whitespace-pre-wrap">{post.content}</p>
              </div>

              {/* Media */}
              {mediaUrl && post.mediaType === 'image' && (
                <img src={mediaUrl} alt="Post attachment" className="w-full" />
              )}
              {mediaUrl && post.mediaType === 'video' && (
                <video src={mediaUrl} controls preload="metadata" className="w-full"><track kind="captions" /></video>
              )}

              {/* Fake social actions bar */}
              <div className="flex items-center gap-6 px-5 py-3 border-t border-gray-100 text-sm text-outline">
                <div className="flex items-center gap-1.5 hover:text-primary cursor-default">
                  <Icon icon="solar:like-bold" className="w-4 h-4" />
                  <span>Like</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-primary cursor-default">
                  <Icon icon="solar:chat-round-bold" className="w-4 h-4" />
                  <span>Comment</span>
                </div>
                <div className="flex items-center gap-1.5 hover:text-primary cursor-default">
                  <Icon icon="solar:share-bold" className="w-4 h-4" />
                  <span>Repost</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — Schedule info + actions */}
          <div className="w-[440px] flex-shrink-0 flex flex-col">
            {/* Close + status */}
            <div className="flex items-center justify-between px-8 pt-8 pb-2">
              <StatusBadge status={post.status} />
              <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-high/50" aria-label="Close">
                <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
              </button>
            </div>

            {/* Title */}
            <div className="px-8 pb-6">
              <h2 className="text-2xl font-bold text-on-surface">Scheduled for {dayName}</h2>
              <p className="text-base text-outline mt-1">{fullDate} at {formatTime(post.scheduledDate, post.scheduledTime)}</p>
            </div>

            {/* Stats */}
            <div className="px-8 space-y-4 flex-1">
              {/* Platform card */}
              <div className="bg-white/60 rounded-xl border border-gray-200/50 px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-outline">Platform</p>
                  <Icon icon={platformIcons[post.platform] || 'solar:chat-round-bold'} className="w-5 h-5" style={{ color: platformColors[post.platform] || '#6B7280' }} />
                </div>
                <p className="text-2xl font-bold text-on-surface capitalize">{post.platform}</p>
              </div>

              {/* Timing card */}
              <div className="bg-white/60 rounded-xl border border-gray-200/50 px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-outline">Timing Score</p>
                  <Icon icon="solar:clock-circle-bold" className="w-5 h-5 text-secondary" />
                </div>
                <div className="flex items-center gap-2">
                  <Icon icon="solar:bolt-bold" className="w-5 h-5 text-amber-500" />
                  <span className="text-lg font-semibold text-on-surface">Peak Activity</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-8 py-6 space-y-3">
              <button
                onClick={() => { onClose(); onScheduleNew(); }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-base font-semibold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm"
              >
                <Icon icon="solar:add-circle-bold" className="w-5 h-5" />
                Schedule New Post
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { onClose(); onEdit(post.id); }}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-base font-medium text-on-surface bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <Icon icon="solar:pen-bold" className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => { onClose(); onDelete(post.id); }}
                  className="p-3 text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  aria-label="Delete post"
                >
                  <Icon icon="solar:trash-bin-trash-bold" className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
