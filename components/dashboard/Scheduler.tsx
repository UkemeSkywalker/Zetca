'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Calendar } from './Calendar';
import { SchedulingModal } from './SchedulingModal';
import { DateDetailsModal } from './DateDetailsModal';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Post } from '@/types/post';

interface SchedulerProps {
  className?: string;
}

type ViewMode = 'calendar' | 'list';

export function Scheduler({ className = '' }: SchedulerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isDateDetailsModalOpen, setIsDateDetailsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Handle date click from calendar
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    
    // Get posts for this date
    const postsForDate = posts.filter(post => {
      const postDate = new Date(post.scheduledDate);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });

    // If there are posts for this date, show details modal
    // Otherwise, show scheduling modal
    if (postsForDate.length > 0) {
      setIsDateDetailsModalOpen(true);
    } else {
      setIsSchedulingModalOpen(true);
    }
  };

  // Handle scheduling a new post
  const handleSchedulePost = (postData: Omit<Post, 'id' | 'createdAt'>) => {
    const newPost: Post = {
      ...postData,
      id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    setPosts(prev => [...prev, newPost]);
  };

  // Handle opening scheduling modal from date details
  const handleScheduleFromDateDetails = () => {
    setIsDateDetailsModalOpen(false);
    setIsSchedulingModalOpen(true);
  };

  // Handle opening scheduling modal for new post
  const handleScheduleNewPost = (date?: Date) => {
    setSelectedDate(date || new Date());
    setIsSchedulingModalOpen(true);
  };

  // Handle deleting a post
  const handleDeletePost = (postId: string) => {
    setPosts(prev => prev.filter(post => post.id !== postId));
  };

  // Handle editing a post (for future implementation)
  const handleEditPost = (postId: string) => {
    // TODO: Implement edit functionality
    console.log('Edit post:', postId);
  };

  // Sort posts chronologically (nearest first)
  const sortedPosts = [...posts].sort((a, b) => 
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );

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
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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

  return (
    <div className={className}>
      {/* Header with view toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'calendar' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            leftIcon="solar:calendar-bold"
          >
            Calendar
          </Button>
          <Button
            variant={viewMode === 'list' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            leftIcon="solar:list-bold"
          >
            List
          </Button>
        </div>

        <Button
          onClick={() => handleScheduleNewPost()}
          leftIcon="solar:add-circle-bold"
        >
          Schedule Post
        </Button>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Calendar
          posts={posts}
          onDateClick={handleDateClick}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {sortedPosts.length === 0 ? (
            <div className="p-8 text-center">
              <Icon icon="solar:calendar-bold" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled posts</h3>
              <p className="text-gray-500 mb-4">
                Start by scheduling your first post to see it appear here.
              </p>
              <Button
                onClick={() => handleScheduleNewPost()}
                leftIcon="solar:add-circle-bold"
              >
                Schedule Your First Post
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {sortedPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Post content */}
                      <p className="text-gray-900 mb-2 line-clamp-3">
                        {post.content}
                      </p>
                      
                      {/* Post metadata */}
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Icon 
                            icon={platformIcons[post.platform]} 
                            className="w-4 h-4" 
                          />
                          <span className="capitalize">{post.platform}</span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Icon icon="solar:calendar-bold" className="w-4 h-4" />
                          <span>{formatDate(new Date(post.scheduledDate))}</span>
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
                        onClick={() => handleEditPost(post.id)}
                        leftIcon="solar:pen-bold"
                        aria-label="Edit post"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePost(post.id)}
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
          )}
        </div>
      )}

      {/* Date Details Modal */}
      <DateDetailsModal
        isOpen={isDateDetailsModalOpen}
        onClose={() => {
          setIsDateDetailsModalOpen(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        posts={selectedDate ? posts.filter(post => {
          const postDate = new Date(post.scheduledDate);
          return (
            postDate.getDate() === selectedDate.getDate() &&
            postDate.getMonth() === selectedDate.getMonth() &&
            postDate.getFullYear() === selectedDate.getFullYear()
          );
        }) : []}
        onScheduleNew={handleScheduleFromDateDetails}
        onEditPost={handleEditPost}
        onDeletePost={handleDeletePost}
      />

      {/* Scheduling Modal */}
      <SchedulingModal
        isOpen={isSchedulingModalOpen}
        onClose={() => {
          setIsSchedulingModalOpen(false);
          setSelectedDate(null);
        }}
        selectedDate={selectedDate}
        onSchedulePost={handleSchedulePost}
      />
    </div>
  );
}