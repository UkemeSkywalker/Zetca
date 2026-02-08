'use client';

import React, { useState, useEffect } from 'react';
import { Post } from '@/types/post';
import { StatusBadge } from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { Icon } from '@iconify/react';
import mockPostsData from '@/data/mockPosts.json';

type StatusFilter = 'all' | 'scheduled' | 'published' | 'draft';
type ViewMode = 'list' | 'grid';

interface PostsTableProps {
  className?: string;
}

export const PostsTable: React.FC<PostsTableProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Load mock posts on mount
  useEffect(() => {
    const loadedPosts = mockPostsData.posts.map(post => ({
      ...post,
      platform: post.platform as 'instagram' | 'twitter' | 'linkedin' | 'facebook',
      status: post.status as 'scheduled' | 'published' | 'draft',
      scheduledDate: new Date(post.scheduledDate),
      createdAt: new Date(post.scheduledDate),
    }));
    setPosts(loadedPosts);
  }, []);

  // Filter posts by status
  const filteredPosts = posts.filter(post => {
    if (statusFilter === 'all') return true;
    return post.status === statusFilter;
  });

  // Sort posts chronologically (nearest first)
  const sortedPosts = [...filteredPosts].sort((a, b) => {
    return a.scheduledDate.getTime() - b.scheduledDate.getTime();
  });

  // Handle publish action
  const handlePublish = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(post =>
        post.id === postId
          ? { ...post, status: 'published' as const, publishedAt: new Date() }
          : post
      )
    );
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get platform icon
  const getPlatformIcon = (platform: string) => {
    const iconMap: Record<string, string> = {
      instagram: 'solar:instagram-bold',
      twitter: 'solar:twitter-bold',
      linkedin: 'solar:linkedin-bold',
      facebook: 'solar:facebook-bold',
    };
    return iconMap[platform] || 'solar:global-bold';
  };

  return (
    <div className={`w-full ${className}`}>
      {/* Filter and View Toggle */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
            Filter by status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {sortedPosts.length} {sortedPosts.length === 1 ? 'post' : 'posts'}
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1" role="group" aria-label="View mode">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <Icon icon="solar:list-bold" className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
            >
              <Icon icon="solar:widget-4-bold" className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      {viewMode === 'list' && (
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No posts found
                  </td>
                </tr>
              ) : (
                sortedPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-md truncate">
                        {post.content}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Icon icon={getPlatformIcon(post.platform)} className="w-5 h-5 text-gray-600" />
                        <span className="text-sm text-gray-900 capitalize">{post.platform}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDate(post.scheduledDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {post.scheduledTime}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={post.status} />
                    </td>
                    <td className="px-6 py-4">
                      {post.status === 'scheduled' && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePublish(post.id)}
                          leftIcon="solar:send-square-bold"
                          aria-label={`Publish post: ${post.content.substring(0, 50)}...`}
                        >
                          Publish
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Desktop Grid View */}
      {viewMode === 'grid' && (
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedPosts.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No posts found
            </div>
          ) : (
            sortedPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
              >
                {/* Platform and Status */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon icon={getPlatformIcon(post.platform)} className="w-5 h-5 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700 capitalize">{post.platform}</span>
                  </div>
                  <StatusBadge status={post.status} />
                </div>

                {/* Content */}
                <p className="text-sm text-gray-900 mb-4 line-clamp-3">
                  {post.content}
                </p>

                {/* Date and Time */}
                <div className="flex items-center gap-4 text-xs text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Icon icon="solar:calendar-bold" className="w-4 h-4" />
                    <span>{formatDate(post.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Icon icon="solar:clock-circle-bold" className="w-4 h-4" />
                    <span>{post.scheduledTime}</span>
                  </div>
                </div>

                {/* Actions */}
                {post.status === 'scheduled' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePublish(post.id)}
                    leftIcon="solar:send-square-bold"
                    className="w-full"
                  >
                    Publish
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {sortedPosts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No posts found
          </div>
        ) : (
          sortedPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
            >
              {/* Content */}
              <div className="text-sm text-gray-900">
                {post.content}
              </div>

              {/* Platform */}
              <div className="flex items-center gap-2">
                <Icon icon={getPlatformIcon(post.platform)} className="w-5 h-5 text-gray-600" />
                <span className="text-sm text-gray-700 capitalize">{post.platform}</span>
              </div>

              {/* Date and Time */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Icon icon="solar:calendar-bold" className="w-4 h-4" />
                  <span>{formatDate(post.scheduledDate)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Icon icon="solar:clock-circle-bold" className="w-4 h-4" />
                  <span>{post.scheduledTime}</span>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <StatusBadge status={post.status} />
                {post.status === 'scheduled' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handlePublish(post.id)}
                    leftIcon="solar:send-square-bold"
                  >
                    Publish
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
