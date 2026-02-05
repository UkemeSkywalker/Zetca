'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Modal } from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Post } from '@/types/post';

interface DateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  posts: Post[];
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

  // Platform icons
  const platformIcons = {
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
                      {/* Post content */}
                      <p className="text-gray-900 mb-3 leading-relaxed">
                        {post.content}
                      </p>
                      
                      {/* Post metadata */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Icon 
                            icon={platformIcons[post.platform]} 
                            className="w-4 h-4" 
                          />
                          <span className="capitalize font-medium">{post.platform}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Icon icon="solar:clock-circle-bold" className="w-4 h-4" />
                          <span>{formatTime(post.scheduledTime)}</span>
                        </div>
                        
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