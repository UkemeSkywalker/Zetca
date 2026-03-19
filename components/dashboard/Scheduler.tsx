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
      const data = await schedulerClient.listPosts();
      setPosts(data);
    } catch (err) {
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
    try {
      if (editingPost) {
        // Update existing post via API
        await schedulerClient.updatePost(editingPost.id, {
          content: postData.content,
          platform: postData.platform,
          scheduledDate: postData.scheduledDate instanceof Date
            ? postData.scheduledDate.toISOString().split('T')[0]
            : String(postData.scheduledDate),
          scheduledTime: postData.scheduledTime,
          status: postData.status,
        });
        setEditingPost(null);
      } else {
        // Create new post via manual-schedule API
        const dateStr = postData.scheduledDate instanceof Date
          ? postData.scheduledDate.toISOString().split('T')[0]
          : String(postData.scheduledDate);
        await schedulerClient.manualSchedule({
          copyId: 'manual-' + Date.now(),
          scheduledDate: dateStr,
          scheduledTime: postData.scheduledTime,
          platform: postData.platform,
        });
      }
      await fetchPosts();
    } catch (err) {
      const message = err instanceof schedulerClient.SchedulerAPIError
        ? err.message
        : 'Failed to save post';
      setOperationError(message);
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
  const handleEditPost = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      // Convert to legacy Post format for SchedulingModal (until task 20 updates it)
      const [year, month, day] = post.scheduledDate.split('-').map(Number);
      const legacyPost = {
        id: post.id,
        content: post.content,
        platform: post.platform as 'instagram' | 'twitter' | 'linkedin' | 'facebook',
        scheduledDate: new Date(year, month - 1, day),
        scheduledTime: post.scheduledTime,
        status: post.status as 'scheduled' | 'published' | 'draft',
        createdAt: new Date(post.createdAt),
      };
      setEditingPost(legacyPost);
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
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div>
          {sortedPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
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
            <div className="space-y-6">
              {Object.entries(
                sortedPosts.reduce<Record<string, ScheduledPost[]>>((groups, post) => {
                  const dateKey = post.scheduledDate;
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(post);
                  return groups;
                }, {})
              ).map(([dateKey, datePosts]) => (
                <div key={dateKey}>
                  {/* Date group header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Icon icon="solar:calendar-bold" className="w-4 h-4 text-indigo-500" />
                      <span>{formatDate(dateKey)}</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {datePosts.length} post{datePosts.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>

                  {/* Posts for this date */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
                    {datePosts.map((post) => (
                      <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {/* Strategy label */}
                            {post.strategyLabel && (
                              <div className="flex items-center gap-2 mb-1">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: post.strategyColor || '#6B7280' }}
                                />
                                <span className="text-xs font-medium text-gray-500">{post.strategyLabel}</span>
                              </div>
                            )}

                            {/* Post content */}
                            <p className="text-gray-900 mb-2 line-clamp-3">
                              {post.content}
                            </p>
                            
                            {/* Post metadata */}
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <div className="flex items-center gap-1">
                                <Icon 
                                  icon={platformIcons[post.platform.toLowerCase()] || 'solar:chat-round-bold'} 
                                  className="w-4 h-4"
                                  style={{ color: platformColors[post.platform.toLowerCase()] }}
                                />
                                <span className="capitalize">{post.platform}</span>
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
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div>
          {sortedPosts.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
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
            <div className="space-y-8">
              {Object.entries(
                sortedPosts.reduce<Record<string, ScheduledPost[]>>((groups, post) => {
                  const dateKey = post.scheduledDate;
                  if (!groups[dateKey]) groups[dateKey] = [];
                  groups[dateKey].push(post);
                  return groups;
                }, {})
              ).map(([dateKey, datePosts]) => (
                <div key={dateKey}>
                  {/* Date group header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Icon icon="solar:calendar-bold" className="w-4 h-4 text-indigo-500" />
                      <span>{formatDate(dateKey)}</span>
                    </div>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {datePosts.length} post{datePosts.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 border-t border-gray-200" />
                  </div>

                  {/* Grid cards for this date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {datePosts.map((post) => (
                      <div
                        key={post.id}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
                      >
                        {/* Top: strategy + content */}
                        <div>
                          {post.strategyLabel && (
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: post.strategyColor || '#6B7280' }}
                              />
                              <span className="text-xs font-medium text-gray-500">{post.strategyLabel}</span>
                            </div>
                          )}
                          <p className="text-sm text-gray-900 line-clamp-4 mb-3">
                            {post.content}
                          </p>
                        </div>

                        {/* Bottom: metadata + actions */}
                        <div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
                            <div className="flex items-center gap-1">
                              <Icon
                                icon={platformIcons[post.platform] || 'solar:chat-round-bold'}
                                className="w-3.5 h-3.5"
                                style={{ color: platformColors[post.platform] }}
                              />
                              <span className="capitalize">{post.platform}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Icon icon="solar:clock-circle-bold" className="w-3.5 h-3.5" />
                              <span>{formatTime(post.scheduledTime)}</span>
                            </div>
                            <StatusBadge status={post.status} />
                          </div>

                          <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
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
        }}
        selectedDate={selectedDate}
        onSchedulePost={handleSchedulePost}
        editingPost={editingPost}
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
