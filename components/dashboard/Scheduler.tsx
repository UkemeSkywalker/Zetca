'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '@iconify/react';
import { Calendar } from './Calendar';
import { SchedulingModal } from './SchedulingModal';
import { DateDetailsModal } from './DateDetailsModal';
import Button from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ScheduledPost } from '@/types/scheduler';
import { Post } from '@/types/post';
import { StrategyRecord } from '@/types/strategy';
import * as schedulerClient from '@/lib/api/schedulerClient';
import { listStrategies } from '@/lib/api/strategyClient';
import { getDownloadUrl } from '@/lib/api/mediaClient';

interface SchedulerProps {
  className?: string;
}

type ViewMode = 'calendar' | 'list' | 'grid';

export function Scheduler({ className = '' }: SchedulerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [isDateDetailsModalOpen, setIsDateDetailsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editingMediaUrl, setEditingMediaUrl] = useState<string | undefined>(undefined);

  // Auto-schedule state
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [showStrategyDropdown, setShowStrategyDropdown] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [lastAutoScheduleStrategyId, setLastAutoScheduleStrategyId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Clear all state
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStrategyDropdown(false);
      }
    };
    if (showStrategyDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStrategyDropdown]);

  // Fetch posts from API on mount
  const fetchPosts = useCallback(async () => {
    try {
      setError(null);
      console.log('[Scheduler] fetchPosts: fetching...');
      const data = await schedulerClient.listPosts();
      console.log('[Scheduler] fetchPosts: received', data.length, 'posts', data.map(p => ({ id: p.id, date: p.scheduledDate, mediaId: p.mediaId, mediaType: p.mediaType })));
      setPosts(data);
    } catch (err) {
      console.error('[Scheduler] fetchPosts: error', err);
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Failed to load scheduled posts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Fetch strategies for auto-schedule dropdown
  const fetchStrategies = useCallback(async () => {
    try {
      const data = await listStrategies();
      setStrategies(data);
    } catch {
      // Silently fail — dropdown will just be empty
    }
  }, []);

  // Handle date click from calendar
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const postsForDate = posts.filter(post => {
      const [year, month, day] = post.scheduledDate.split('-').map(Number);
      return (
        day === date.getDate() &&
        month - 1 === date.getMonth() &&
        year === date.getFullYear()
      );
    });
    if (postsForDate.length > 0) {
      setIsDateDetailsModalOpen(true);
    } else {
      setIsSchedulingModalOpen(true);
    }
  };

  // Handle scheduling a new post or updating an existing one via API
  const handleSchedulePost = async (postData: Omit<Post, 'id' | 'createdAt'>) => {
    setOperationError(null);
    console.log('[Scheduler] handleSchedulePost called', {
      isEditing: !!editingPost,
      editingPostId: editingPost?.id,
      postData: {
        content: postData.content?.substring(0, 50),
        platform: postData.platform,
        scheduledDate: postData.scheduledDate,
        scheduledTime: postData.scheduledTime,
        status: postData.status,
        mediaId: postData.mediaId,
        mediaType: postData.mediaType,
      },
    });
    try {
      if (editingPost) {
        // Update existing post via API
        const dateStr = postData.scheduledDate instanceof Date
          ? `${postData.scheduledDate.getFullYear()}-${String(postData.scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(postData.scheduledDate.getDate()).padStart(2, '0')}`
          : String(postData.scheduledDate);
        const updatePayload = {
          content: postData.content,
          platform: postData.platform,
          scheduledDate: dateStr,
          scheduledTime: postData.scheduledTime,
          status: postData.status,
          ...(postData.mediaId !== undefined ? { mediaId: postData.mediaId, mediaType: postData.mediaType } : {}),
        };
        console.log('[Scheduler] updatePost payload', { postId: editingPost.id, ...updatePayload });
        const result = await schedulerClient.updatePost(editingPost.id, updatePayload);
        console.log('[Scheduler] updatePost result', result);
        setEditingPost(null);
      } else {
        // Create new post via manual-schedule API
        const dateStr = postData.scheduledDate instanceof Date
          ? `${postData.scheduledDate.getFullYear()}-${String(postData.scheduledDate.getMonth() + 1).padStart(2, '0')}-${String(postData.scheduledDate.getDate()).padStart(2, '0')}`
          : String(postData.scheduledDate);
        const schedulePayload = {
          copyId: 'manual-' + Date.now(),
          scheduledDate: dateStr,
          scheduledTime: postData.scheduledTime,
          platform: postData.platform,
          ...(postData.mediaId ? { mediaId: postData.mediaId, mediaType: postData.mediaType } : {}),
        };
        console.log('[Scheduler] manualSchedule payload', schedulePayload);
        const result = await schedulerClient.manualSchedule(schedulePayload);
        console.log('[Scheduler] manualSchedule result', result);
      }
    } catch (err) {
      console.error('[Scheduler] handleSchedulePost error', err);
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Failed to save post';
      setOperationError(message);
    } finally {
      console.log('[Scheduler] handleSchedulePost: re-fetching posts...');
      await fetchPosts();
    }
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

  // Handle deleting a post via API
  const handleDeletePost = async (postId: string) => {
    setOperationError(null);
    try {
      await schedulerClient.deletePost(postId);
      await fetchPosts();
    } catch (err) {
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Failed to delete post';
      setOperationError(message);
    }
  };

  // Handle editing a post
  const handleEditPost = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      const [year, month, day] = post.scheduledDate.split('-').map(Number);
      const legacyPost = {
        id: post.id,
        content: post.content,
        platform: post.platform as 'instagram' | 'twitter' | 'linkedin' | 'facebook',
        scheduledDate: new Date(year, month - 1, day),
        scheduledTime: post.scheduledTime,
        status: post.status as 'scheduled' | 'published' | 'draft',
        createdAt: new Date(post.createdAt),
        ...(post.mediaId ? { mediaId: post.mediaId, mediaType: post.mediaType } : {}),
      };

      // Fetch media download URL if post has media
      let mediaUrl: string | undefined;
      if (post.mediaId) {
        try {
          const res = await getDownloadUrl(post.mediaId);
          mediaUrl = res.downloadUrl;
        } catch {
          // Silently skip — MediaUploader will still show mediaId without preview
        }
      }

      setEditingPost(legacyPost);
      setEditingMediaUrl(mediaUrl);
      setSelectedDate(new Date(year, month - 1, day));
      setIsDateDetailsModalOpen(false);
      setIsSchedulingModalOpen(true);
    }
  };

  // Handle auto-schedule
  const [autoScheduleStrategyName, setAutoScheduleStrategyName] = useState<string>('');

  const handleAutoSchedule = async (strategyId: string) => {
    const strategy = strategies.find(s => s.id === strategyId);
    setAutoScheduleStrategyName(strategy?.brandName || 'your strategy');
    setIsAutoScheduling(true);
    setOperationError(null);
    setShowStrategyDropdown(false);
    setLastAutoScheduleStrategyId(strategyId);
    try {
      await schedulerClient.autoSchedule(strategyId);
      await fetchPosts();
      setLastAutoScheduleStrategyId(null);
    } catch (err) {
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Auto-scheduling failed. Please try again.';
      setOperationError(message);
    } finally {
      setIsAutoScheduling(false);
    }
  };

  // Toggle strategy dropdown and fetch strategies
  const handleAutoScheduleClick = async () => {
    if (!showStrategyDropdown) {
      await fetchStrategies();
    }
    setShowStrategyDropdown(prev => !prev);
  };

  // Handle clearing all scheduled posts
  const handleClearAll = async () => {
    setIsClearingAll(true);
    setOperationError(null);
    setShowClearConfirm(false);
    try {
      await schedulerClient.deleteAllPosts();
      setPosts([]);
    } catch (err) {
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Failed to clear scheduled posts';
      setOperationError(message);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Handle moving posts to a new date via drag-and-drop
  const handleMovePosts = async (postIds: string[], targetDate: string) => {
    setOperationError(null);
    try {
      await Promise.all(
        postIds.map(id => schedulerClient.updatePost(id, { scheduledDate: targetDate }))
      );
      await fetchPosts();
    } catch (err) {
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Failed to move posts';
      setOperationError(message);
    }
  };

  // Sort posts chronologically (nearest first)
  const sortedPosts = [...posts].sort((a, b) =>
    a.scheduledDate.localeCompare(b.scheduledDate) ||
    a.scheduledTime.localeCompare(b.scheduledTime)
  );

  // Platform icons and brand colors
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

  // Format date for display
  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center py-16 ${className}`}>
        <Icon icon="solar:refresh-bold" className="w-8 h-8 text-blue-500 animate-spin" />
        <span className="ml-3 text-gray-600">Loading scheduled posts...</span>
      </div>
    );
  }

  // Error state
  if (error && posts.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <Icon icon="solar:danger-triangle-bold" className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load posts</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <Button onClick={() => { setIsLoading(true); fetchPosts(); }}>
          Try Again
        </Button>
      </div>
    );
  }

  // Full-screen auto-schedule loading overlay
  if (isAutoScheduling) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-indigo-100 flex items-center justify-center">
              <Icon icon="svg-spinners:blocks-shuffle-3" className="w-10 h-10 text-indigo-500" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Zetca is automatically scheduling your posts
          </h3>
          <p className="text-gray-500 text-sm max-w-md text-center">
            Analyzing your strategy and copies to find the best dates and times for each post. This may take a moment...
          </p>
          {autoScheduleStrategyName && (
            <p className="mt-3 text-sm text-indigo-600 font-medium">
              Strategy: {autoScheduleStrategyName}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Operation error banner */}
      {operationError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <Icon icon="solar:danger-triangle-bold" className="w-4 h-4" />
            {operationError}
          </div>
          <div className="flex items-center gap-2">
            {lastAutoScheduleStrategyId && (
              <button
                onClick={() => handleAutoSchedule(lastAutoScheduleStrategyId)}
                className="text-sm text-red-700 hover:text-red-900 font-medium underline"
                disabled={isAutoScheduling}
              >
                Retry
              </button>
            )}
            <button onClick={() => { setOperationError(null); setLastAutoScheduleStrategyId(null); }} className="text-red-400 hover:text-red-600">
              <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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
          <Button
            variant={viewMode === 'grid' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            leftIcon="solar:widget-bold"
          >
            Grid
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Clear All button — only show when there are posts */}
          {posts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              leftIcon="solar:trash-bin-trash-bold"
              disabled={isClearingAll}
              isLoading={isClearingAll}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            >
              Clear All
            </Button>
          )}

          {/* Auto Schedule button with strategy dropdown */}
          <div className="relative" ref={dropdownRef}>
            <Button
              variant="outline"
              onClick={handleAutoScheduleClick}
              leftIcon="solar:magic-stick-bold"
              disabled={isAutoScheduling}
              isLoading={isAutoScheduling}
            >
              Auto Schedule
            </Button>
            {showStrategyDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-500 px-2 py-1">Select a strategy</p>
                  {strategies.length === 0 ? (
                    <p className="text-sm text-gray-400 px-2 py-3 text-center">No strategies found</p>
                  ) : (
                    strategies.map((strategy) => (
                      <button
                        key={strategy.id}
                        onClick={() => handleAutoSchedule(strategy.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        {strategy.brandName}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={() => handleScheduleNewPost()}
            leftIcon="solar:add-circle-bold"
          >
            Schedule Post
          </Button>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <Calendar
          posts={posts}
          onDateClick={handleDateClick}
          onMovePosts={handleMovePosts}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div>
          {sortedPosts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <Icon icon="solar:calendar-bold" className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium font-heading text-gray-900 mb-2">No scheduled posts</h3>
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
            <div className="space-y-8">
              {Object.entries(
                sortedPosts.reduce<Record<string, ScheduledPost[]>>((groups, post) => {
                  const dateKey = post.scheduledDate;
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(post);
                  return groups;
                }, {})
              ).map(([dateKey, datePosts]) => {
                const [y, m, d] = dateKey.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dateLabel = dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }).toUpperCase();

                return (
                  <div key={dateKey}>
                    {/* Date separator */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-xs font-bold font-heading tracking-widest text-gray-400 whitespace-nowrap">
                        {dateLabel}
                      </span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Post rows */}
                    <div className="space-y-3">
                      {datePosts.map((post) => (
                        <div
                          key={post.id}
                          className="bg-white rounded-xl border border-gray-200 border-l-4 border-l-indigo-400 px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow"
                        >
                          {/* Strategy avatar */}
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-white"
                            style={{ backgroundColor: post.strategyColor || '#6366F1' }}
                          >
                            {(post.strategyLabel || 'Post').substring(0, 4)}
                          </div>

                          {/* Content block */}
                          <div className="flex-1 min-w-0">
                            {/* Top row: label + platform icons */}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">
                                {post.strategyLabel || 'Post'}
                              </span>
                              <span className="text-gray-300">·</span>
                              <Icon
                                icon={platformIcons[post.platform.toLowerCase()] || 'solar:chat-round-bold'}
                                className="w-4 h-4"
                                style={{ color: platformColors[post.platform.toLowerCase()] || '#6B7280' }}
                              />
                            </div>
                            {/* Content preview */}
                            <p className="text-sm text-gray-500 truncate">
                              {post.content}
                            </p>
                          </div>

                          {/* Time + status */}
                          <div className="text-right shrink-0">
                            <div className="text-base font-bold font-heading text-gray-900">
                              {formatTime(post.scheduledTime)}
                            </div>
                            <div className="text-[10px] font-bold tracking-wider uppercase text-gray-400">
                              {post.status}
                            </div>
                          </div>

                          {/* Status badge */}
                          <div className="shrink-0">
                            <span className={`
                              inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                              ${post.status === 'published'
                                ? 'bg-green-50 text-green-600'
                                : post.status === 'scheduled'
                                  ? 'bg-indigo-50 text-indigo-600'
                                  : 'bg-gray-100 text-gray-500'
                              }
                            `}>
                              <span className={`w-2 h-2 rounded-full ${
                                post.status === 'published'
                                  ? 'bg-green-500'
                                  : post.status === 'scheduled'
                                    ? 'bg-indigo-500'
                                    : 'bg-gray-400'
                              }`} />
                              {post.status === 'scheduled' ? 'Ready' : post.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div>
          {sortedPosts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
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
            <div className="space-y-10">
              {Object.entries(
                sortedPosts.reduce<Record<string, ScheduledPost[]>>((groups, post) => {
                  const dateKey = post.scheduledDate;
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(post);
                  return groups;
                }, {})
              ).map(([dateKey, datePosts]) => {
                const [y, m, d] = dateKey.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);
                const dayAbbr = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dayNum = d;
                const fullDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                return (
                  <div key={dateKey}>
                    {/* Date group header */}
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold font-heading text-indigo-500 leading-none">{dayAbbr}</span>
                        <span className="text-lg font-bold font-heading text-indigo-700 leading-tight">{dayNum}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold font-heading text-gray-900">{fullDate}</h3>
                        <p className="text-xs font-medium text-gray-400">
                          {datePosts.length} post{datePosts.length !== 1 ? 's' : ''} scheduled
                        </p>
                      </div>
                    </div>

                    {/* Grid cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {datePosts.map((post) => (
                        <div
                          key={post.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-indigo-400 p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                        >
                          {/* Top row: platform icon + actions */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className="w-9 h-9 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: `${platformColors[post.platform] || '#6B7280'}15` }}
                              >
                                <Icon
                                  icon={platformIcons[post.platform] || 'solar:chat-round-bold'}
                                  className="w-4.5 h-4.5"
                                  style={{ color: platformColors[post.platform] || '#6B7280' }}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleEditPost(post.id)}
                                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                  aria-label="Edit post"
                                >
                                  <Icon icon="solar:pen-bold" className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  aria-label="Delete post"
                                >
                                  <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Content */}
                            <p className="text-base font-sans text-gray-800 leading-relaxed line-clamp-4 mb-4">
                              {post.content}
                            </p>
                          </div>

                          {/* Bottom: time + status */}
                          <div className="flex items-center justify-between text-sm font-medium pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-gray-500">
                              <Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5 text-gray-400" />
                              <span>{formatTime(post.scheduledTime)}</span>
                            </div>
                            <span className="text-xs font-bold tracking-wider uppercase text-indigo-500">
                              {post.status}
                            </span>
                          </div>
                        </div>
                      ))}

                      {/* Add post placeholder card */}
                      <button
                        onClick={() => handleScheduleNewPost(dateObj)}
                        className="rounded-xl border-2 border-dashed border-gray-200 p-4 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all min-h-[160px]"
                      >
                        <Icon icon="solar:add-circle-bold" className="w-8 h-8" />
                        <span className="text-sm font-medium">Schedule {dayName} Post</span>
                      </button>
                    </div>
                  </div>
                );
              })}
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
          const [year, month, day] = post.scheduledDate.split('-').map(Number);
          return (
            day === selectedDate.getDate() &&
            month - 1 === selectedDate.getMonth() &&
            year === selectedDate.getFullYear()
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
          setEditingPost(null);
          setEditingMediaUrl(undefined);
        }}
        selectedDate={selectedDate}
        onSchedulePost={handleSchedulePost}
        editingPost={editingPost}
        prefillMediaId={editingPost?.mediaId}
        prefillMediaType={editingPost?.mediaType}
        prefillMediaUrl={editingMediaUrl}
      />

      {/* Clear All Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Icon icon="solar:trash-bin-trash-bold" className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Clear all posts?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              This will permanently delete all {posts.length} scheduled post{posts.length !== 1 ? 's' : ''} from your calendar. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setShowClearConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleClearAll}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
