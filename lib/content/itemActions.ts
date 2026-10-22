/**
 * What edit and delete mean for each kind of item, so the Scheduler,
 * Publisher and video page all say the same thing.
 */

import type { ScheduledPost } from '@/types/scheduler';

export interface RemoveCopy {
  title: string;
  message: string;
  confirmLabel: string;
  menuLabel: string;
}

const PLATFORM: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  facebook: 'Facebook',
  twitter: 'X',
  x: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
};

export function removeCopy(item: ScheduledPost): RemoveCopy {
  const where = PLATFORM[item.platform] ?? item.platform;
  if (item.youtube) {
    if (!item.youtube.youtubeVideoId) {
      return {
        title: 'Cancel this video?',
        message: 'It hasn’t gone to YouTube yet, so it won’t be uploaded. The video file is deleted from Zetca.',
        confirmLabel: 'Cancel video',
        menuLabel: 'Cancel video',
      };
    }
    return {
      title: 'Remove from Zetca?',
      message:
        item.youtube.status === 'scheduled'
          ? 'It’s removed from Zetca only. It stays on YouTube and still goes public at its scheduled time. To stop that, change it in YouTube Studio.'
          : 'It’s removed from Zetca only. The video stays on YouTube.',
      confirmLabel: 'Remove from Zetca',
      menuLabel: 'Remove from Zetca',
    };
  }
  if (item.status === 'published') {
    return {
      title: 'Remove from Zetca?',
      message: `It’s removed from Zetca only. The post stays on ${where}.`,
      confirmLabel: 'Remove from Zetca',
      menuLabel: 'Remove from Zetca',
    };
  }
  return {
    title: 'Delete this post?',
    message: `It’s deleted and won’t be published${item.status === 'scheduled' ? ` to ${where}` : ''}.`,
    confirmLabel: 'Delete post',
    menuLabel: 'Delete',
  };
}

/**
 * Posts can be edited until they're published. YouTube videos can be edited
 * any time except mid-upload; once on YouTube, edits are sent there too.
 */
export function canEdit(item: ScheduledPost): boolean {
  if (item.youtube) return item.youtube.status !== 'uploading';
  return item.status !== 'published' && item.status !== 'publishing';
}
