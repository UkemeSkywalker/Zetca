'use client';

import React, { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
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

export function DateDetailsModal({
  isOpen,
  onClose,
  selectedDate,
  posts,
  onScheduleNew,
  onEditPost,
  onDeletePost
}: DateDetailsModalProps) {
  if (!selectedDate) return null;

  // Track fetched media download URLs by mediaId
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});

  // Fetch presigned download URLs for posts with media when modal opens
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
          } catch {
            // Silently skip failed fetches
          }
        })
      );
      if (!cancelled) setMediaUrls(prev => ({ ...prev, ...urls }));
    };
    fetchUrls();
    return () => { cancelled = true; };
  }, [isOpen, posts]);

  const getMediaUrl = (post: ScheduledPost): string | undefined =>
    post.mediaUrl || (post.mediaId ? mediaUrls[post.mediaId] : undefined);

  // Platform icons
  const platformIcons: Record<string, string> = {
    instagram: 'solar:camera-bold',
    twitter: 'solar:chat-round-bold',
    linkedin: 'solar:user-bold',
    facebook: 'solar:users-group-rounded-bold'
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Sort posts by time
  const sortedPosts = [...posts].sort((a, b) => {
    const timeA = a.scheduledTime;
    const timeB = b.scheduledTime;
    return timeA.localeCompare(timeB);
  });

  const footer = (
    <Button
      onClick={onScheduleNew}
      leftIcon="solar:add-circle-bold"
    >
      Schedule New Post
    </Button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={formatDate(selectedDate)}
      footer={footer}
      size="lg"
    >
      <div className="space-y-4">
        {sortedPosts.length === 0 ? (
          <div className="text-center py-8">
            <Icon icon="solar:calendar-bold" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No posts scheduled</h3>
            <p className="text-gray-500 mb-4">
              No posts are scheduled for this date yet.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'} scheduled
              </h3>
            </div>
            
            <div className="space-y-3">
              {sortedPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Strategy indicator */}
                      {post.strategyLabel && (
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: post.strategyColor || '#6B7280' }}
                          />
                          <span className="text-xs font-medium text-gray-500">{post.strategyLabel}</span>
                        </div>
                      )}

                      {/* Post content */}
                      <p className="text-gray-900 mb-3 leading-relaxed">
                        {post.content}
                      </p>

                      {/* Media preview */}
                      {post.mediaType && (
                        <div className="mb-3">
                          {(() => {
                            const url = getMediaUrl(post);
                            if (!url) {
                              return (
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Icon
                                    icon={post.mediaType === 'image' ? 'solar:gallery-bold' : 'solar:videocamera-record-bold'}
                                    className="w-4 h-4"
                                  />
                                  <span>Loading {post.mediaType} preview…</span>
                                </div>
                              );
                            }
                            if (post.mediaType === 'image') {
                              return (
                                <img
                                  src={url}
                                  alt="Post attachment"
                                  className="max-h-48 rounded-lg object-cover border border-gray-200"
                                />
                              );
                            }
                            return (
                              <video
                                src={url}
                                controls
                                preload="metadata"
                                className="max-h-48 rounded-lg border border-gray-200"
                              >
                                <track kind="captions" />
                              </video>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Post metadata */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Icon 
                            icon={platformIcons[post.platform] || 'solar:chat-round-bold'} 
                            className="w-4 h-4" 
                          />
                          <span className="capitalize font-medium">{post.platform}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Icon icon="solar:clock-circle-bold" className="w-4 h-4" />
                          <span>{formatTime(post.scheduledTime)}</span>
                        </div>

                        {post.mediaType === 'image' && (
                          <div className="flex items-center gap-1">
                            <Icon icon="solar:gallery-bold" className="w-4 h-4" />
                            <span>Image</span>
                          </div>
                        )}
                        {post.mediaType === 'video' && (
                          <div className="flex items-center gap-1">
                            <Icon icon="solar:videocamera-record-bold" className="w-4 h-4" />
                            <span>Video</span>
                          </div>
                        )}
                        
                        <StatusBadge status={post.status} />
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditPost(post.id)}
                        leftIcon="solar:pen-bold"
                        aria-label="Edit post"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePost(post.id)}
                        leftIcon="solar:trash-bin-trash-bold"
                        aria-label="Delete post"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}