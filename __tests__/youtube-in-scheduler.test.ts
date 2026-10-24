/**
 * @jest-environment node
 */

import { videoToPost, isYouTubeItem, videoPagePath } from '@/lib/api/youtubeApi';
import { VideoDetailsSchema, type PublicYouTubeVideo } from '@/lib/models/youtubeVideo';

const details = VideoDetailsSchema.parse({ title: 'Netflix Movies Update', categoryId: '24', madeForKids: false, publishMode: 'now' });

const video = (patch: Partial<PublicYouTubeVideo> = {}): PublicYouTubeVideo => ({
  videoId: 'v1',
  userId: 'u1',
  mediaId: 'm1',
  channelId: 'UC1',
  status: 'queued',
  details,
  isShort: true,
  createdAt: '2026-10-21T10:00:00.000Z',
  updatedAt: '2026-10-21T10:00:00.000Z',
  ...patch,
});

describe('videoToPost', () => {
  it('places a scheduled video on its publish time, in UTC like posts', () => {
    const post = videoToPost(video({ status: 'scheduled', publishAt: '2099-10-23T17:00:00.000Z', youtubeVideoId: 'yt1' }));
    expect(post).toMatchObject({
      id: 'youtube:v1',
      platform: 'youtube',
      content: 'Netflix Movies Update',
      scheduledDate: '2099-10-23',
      scheduledTime: '17:00',
      status: 'scheduled',
      mediaId: 'm1',
      mediaType: 'video',
      youtube: { videoId: 'v1', status: 'scheduled', youtubeVideoId: 'yt1' },
    });
  });

  it('places a video published straight away on when it went up', () => {
    const post = videoToPost(video({ status: 'published', uploadedAt: '2026-10-21T10:05:00.000Z' }));
    expect(post).toMatchObject({ scheduledDate: '2026-10-21', scheduledTime: '10:05', status: 'published' });
  });

  it('maps upload states to post statuses, with the failure reason', () => {
    expect(videoToPost(video({ status: 'uploading' })).status).toBe('publishing');
    expect(videoToPost(video({ status: 'waiting_quota' })).status).toBe('scheduled');
    const failed = videoToPost(video({ status: 'failed', error: { code: 'reconnect', message: 'Reconnect YouTube' } }));
    expect(failed).toMatchObject({ status: 'failed', lastError: 'Reconnect YouTube' });
  });

  it('marks items so the Scheduler opens their page instead of the post editor', () => {
    expect(isYouTubeItem(videoToPost(video()).id)).toBe(true);
    expect(isYouTubeItem('post-123')).toBe(false);
    expect(videoPagePath('v1')).toBe('/dashboard/scheduler/youtube/v1');
  });
});
