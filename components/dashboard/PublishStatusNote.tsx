'use client';

import { Icon } from '@iconify/react';
import { AUTO_PUBLISH_PLATFORMS, type ScheduledPost } from '@/types/scheduler';

/**
 * Why a post failed, when it'll be retried, or that it won't post itself
 * (platforms other than LinkedIn). Renders nothing when there's nothing to say.
 */
export function PublishStatusNote({ post, className = '' }: { post: ScheduledPost; className?: string }) {
  if (post.status === 'failed') {
    return (
      <p className={`flex items-start gap-2 text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 ${className}`} role="note">
        <Icon icon="solar:danger-triangle-bold" className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-inherit">{post.lastError || 'Publishing failed.'} Edit the post to reschedule it.</span>
      </p>
    );
  }
  if (post.status === 'scheduled' && post.lastError && post.nextAttemptAt) {
    const retry = new Date(post.nextAttemptAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <p className={`flex items-start gap-2 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 ${className}`} role="note">
        <Icon icon="solar:refresh-circle-linear" className="w-4 h-4 mt-0.5 shrink-0" />
        <span className="text-inherit">
          The last try didn’t work ({post.lastError.replace(/\.$/, '')}). Trying again at {retry}.
        </span>
      </p>
    );
  }
  if ((post.status === 'scheduled' || post.status === 'draft') && !AUTO_PUBLISH_PLATFORMS.includes(post.platform)) {
    return (
      <p className={`flex items-start gap-2 text-xs text-outline ${className}`} role="note">
        <Icon icon="solar:info-circle-linear" className="w-4 h-4 shrink-0" />
        <span className="text-inherit">Won’t post automatically — only LinkedIn is supported so far. Post it yourself at this time.</span>
      </p>
    );
  }
  return null;
}
