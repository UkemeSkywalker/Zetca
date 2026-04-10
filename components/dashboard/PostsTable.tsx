'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Post } from '@/types/post';
import { Icon } from '@iconify/react';
import mockPostsData from '@/data/mockPosts.json';

type StatusFilter = 'all' | 'scheduled' | 'published' | 'draft';
type PlatformFilter = 'all' | 'linkedin' | 'instagram' | 'twitter' | 'facebook';
type ViewMode = 'list' | 'grid';

interface PostsTableProps {
  className?: string;
}

const POSTS_PER_PAGE = 10;

// Derive a short title from content
const deriveTitle = (content: string) => {
  const words = content.split(' ').slice(0, 4).join(' ');
  return words.length < content.length ? `${words}...` : words;
};

// Random time-ago labels for display
const updatedAgoLabels = ['2h ago', '5h ago', '1d ago', '3h ago', '30m ago', '6h ago', '2d ago', '1h ago'];

const platformColors: Record<string, string> = {
  linkedin: 'bg-blue-600',
  instagram: 'bg-pink-500',
  twitter: 'bg-sky-500',
  facebook: 'bg-blue-500',
};

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  twitter: 'Twitter / X',
  facebook: 'Facebook',
};

const thumbnailColors = [
  'from-teal-400 to-teal-600',
  'from-green-400 to-green-600',
  'from-indigo-400 to-indigo-600',
  'from-slate-400 to-slate-600',
  'from-purple-400 to-purple-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-amber-600',
  'from-cyan-400 to-cyan-600',
];

const thumbnailIcons = [
  'solar:planet-3-bold',
  'solar:leaf-bold',
  'solar:chat-square-bold',
  'solar:rocket-2-bold',
  'solar:star-bold',
  'solar:lightbulb-bolt-bold',
  'solar:graph-up-bold',
  'solar:heart-bold',
];

const StatusDot: React.FC<{ status: string }> = ({ status }) => {
  const dotColor =
    status === 'published'
      ? 'bg-emerald-500'
      : status === 'scheduled'
      ? 'bg-primary'
      : 'bg-gray-400';

  const labelColor =
    status === 'published'
      ? 'text-emerald-700'
      : status === 'scheduled'
      ? 'text-primary'
      : 'text-gray-500';

  const label =
    status === 'published'
      ? 'Published'
      : status === 'scheduled'
      ? 'Scheduled'
      : 'Draft';

  return (
    <span className={`inline-flex items-center gap-2 text-sm font-medium ${labelColor}`}>
      <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

export const PostsTable: React.FC<PostsTableProps> = ({ className = '' }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const loadedPosts = mockPostsData.posts.map((post) => ({
      ...post,
      platform: post.platform as Post['platform'],
      status: post.status as Post['status'],
      scheduledDate: new Date(post.scheduledDate),
      createdAt: new Date(post.scheduledDate),
    }));
    setPosts(loadedPosts);
  }, []);

  const filteredPosts = useMemo(() => {
    const filtered = posts.filter((post) => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (platformFilter !== 'all' && post.platform !== platformFilter) return false;
      return true;
    });
    return [...filtered].sort(
      (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime()
    );
  }, [posts, statusFilter, platformFilter]);

  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  const handlePublish = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, status: 'published' as const, publishedAt: new Date() }
          : post
      )
    );
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const getPlatformIcon = (platform: string) => {
    const map: Record<string, string> = {
      instagram: 'mdi:instagram',
      twitter: 'simple-icons:x',
      linkedin: 'mdi:linkedin',
      facebook: 'mdi:facebook',
    };
    return map[platform] || 'solar:global-bold';
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, platformFilter]);

  return (
    <div className={`w-full ${className}`}>
      {/* Header Controls */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        {/* View Toggle */}
        <div
          className="flex items-center bg-surface-container-low rounded-xl p-1 ghost-border"
          role="group"
          aria-label="View mode"
        >
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-primary shadow-ambient-sm'
                : 'text-outline hover:text-on-surface'
            }`}
            aria-label="List view"
            aria-pressed={viewMode === 'list'}
          >
            <Icon icon="solar:list-bold" className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-primary shadow-ambient-sm'
                : 'text-outline hover:text-on-surface'
            }`}
            aria-label="Grid view"
            aria-pressed={viewMode === 'grid'}
          >
            <Icon icon="solar:widget-4-bold" className="w-4 h-4" />
            Grid
          </button>
        </div>

        {/* Filters */}
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-outline hover:text-on-surface ghost-border hover:bg-surface-container-low transition-colors"
          >
            <Icon icon="solar:tuning-2-bold" className="w-4 h-4" />
            Filters
            {(statusFilter !== 'all' || platformFilter !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-ambient p-3 z-20 min-w-[200px] ghost-border space-y-3">
              {/* Status filter */}
              <div>
                <p className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-1.5 px-1">
                  Status
                </p>
                {(['all', 'scheduled', 'published', 'draft'] as StatusFilter[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setStatusFilter(filter)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        statusFilter === filter
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  )
                )}
              </div>

              {/* Platform filter */}
              <div className="border-t border-surface-container-high/50 pt-3">
                <p className="text-[11px] font-semibold text-outline uppercase tracking-wider mb-1.5 px-1">
                  Platform
                </p>
                {(['all', 'linkedin', 'instagram', 'twitter', 'facebook'] as PlatformFilter[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setPlatformFilter(filter)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        platformFilter === filter
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      {filter !== 'all' && (
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center ${platformColors[filter]}`}
                        >
                          <Icon
                            icon={getPlatformIcon(filter)}
                            className="w-2.5 h-2.5 text-white"
                          />
                        </span>
                      )}
                      {filter === 'all' ? 'All' : platformLabels[filter]}
                    </button>
                  )
                )}
              </div>

              {/* Clear filters */}
              {(statusFilter !== 'all' || platformFilter !== 'all') && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setPlatformFilter('all');
                    setShowFilters(false);
                  }}
                  className="w-full text-center px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/5 transition-colors border-t border-surface-container-high/50 pt-3"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* List View - Desktop */}
      {viewMode === 'list' && (
        <div className="hidden md:block bg-white rounded-2xl ghost-border overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_auto] gap-6 px-8 py-4 bg-surface-container-low/50">
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Content Snippet
            </span>
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Platform
            </span>
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Date
            </span>
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Time
            </span>
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Status
            </span>
            <span className="text-xs font-semibold text-outline uppercase tracking-wider">
              Actions
            </span>
          </div>

          {/* Table Rows */}
          {paginatedPosts.length === 0 ? (
            <div className="px-8 py-16 text-center text-outline text-base">No posts found</div>
          ) : (
            paginatedPosts.map((post, idx) => {
              const globalIdx =
                (currentPage - 1) * POSTS_PER_PAGE + idx;
              return (
                <div
                  key={post.id}
                  className="grid grid-cols-[2.5fr_1fr_1fr_1fr_1fr_auto] gap-6 px-8 py-5 items-center border-t border-surface-container-high/50 hover:bg-surface-container-low/30 transition-colors"
                >
                  {/* Content Snippet */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                        thumbnailColors[globalIdx % thumbnailColors.length]
                      } flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon
                        icon={thumbnailIcons[globalIdx % thumbnailIcons.length]}
                        className="w-6 h-6 text-white"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium text-on-surface truncate">
                        {deriveTitle(post.content)}
                      </p>
                      <p className="text-sm text-outline mt-0.5">
                        Updated {updatedAgoLabels[globalIdx % updatedAgoLabels.length]}
                      </p>
                    </div>
                  </div>

                  {/* Platform */}
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-6 h-6 rounded flex items-center justify-center ${
                        platformColors[post.platform]
                      }`}
                    >
                      <Icon
                        icon={getPlatformIcon(post.platform)}
                        className="w-3.5 h-3.5 text-white"
                      />
                    </span>
                    <span className="text-base text-on-surface">
                      {platformLabels[post.platform]}
                    </span>
                  </div>

                  {/* Date */}
                  <span className={`text-base ${post.status === 'draft' ? 'text-outline/50 italic' : 'text-on-surface'}`}>
                    {post.status === 'draft' ? 'No date set' : formatDate(post.scheduledDate)}
                  </span>

                  {/* Time */}
                  <span className={`text-base ${post.status === 'draft' ? 'text-outline/50' : 'text-on-surface font-medium'}`}>
                    {post.status === 'draft' ? '--:--' : formatTime(post.scheduledDate)}
                  </span>

                  {/* Status */}
                  <StatusDot status={post.status} />

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    {post.status === 'published' && (
                      <button
                        className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                        aria-label="View post"
                      >
                        <Icon icon="solar:eye-bold" className="w-5 h-5" />
                      </button>
                    )}
                    {post.status === 'scheduled' && (
                      <button
                        className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                        aria-label="Edit post"
                      >
                        <Icon icon="solar:pen-2-bold" className="w-5 h-5" />
                      </button>
                    )}
                    {post.status === 'draft' && (
                      <button
                        onClick={() => handlePublish(post.id)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors"
                        aria-label={`Publish post: ${post.content.substring(0, 40)}`}
                      >
                        Publish
                      </button>
                    )}
                    <button
                      className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                      aria-label="More options"
                    >
                      <Icon icon="solar:menu-dots-bold" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Grid View - Desktop */}
      {viewMode === 'grid' && (
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedPosts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-outline">
              No posts found
            </div>
          ) : (
            paginatedPosts.map((post, idx) => {
              const globalIdx = (currentPage - 1) * POSTS_PER_PAGE + idx;
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-2xl ghost-border p-6 hover:shadow-ambient transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                        thumbnailColors[globalIdx % thumbnailColors.length]
                      } flex items-center justify-center`}
                    >
                      <Icon
                        icon={thumbnailIcons[globalIdx % thumbnailIcons.length]}
                        className="w-6 h-6 text-white"
                      />
                    </div>
                    <StatusDot status={post.status} />
                  </div>
                  <p className="text-base font-medium text-on-surface mb-1.5 line-clamp-2">
                    {post.content}
                  </p>
                  <p className="text-sm text-outline mb-5">
                    Updated {updatedAgoLabels[globalIdx % updatedAgoLabels.length]}
                  </p>
                  <div className="flex items-center gap-3 text-sm text-outline mb-5">
                    <span className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          platformColors[post.platform]
                        }`}
                      >
                        <Icon
                          icon={getPlatformIcon(post.platform)}
                          className="w-3 h-3 text-white"
                        />
                      </span>
                      {platformLabels[post.platform]}
                    </span>
                    <span>
                      {post.status === 'draft'
                        ? 'No date set'
                        : formatDate(post.scheduledDate)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/50">
                    {post.status === 'draft' ? (
                      <button
                        onClick={() => handlePublish(post.id)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors"
                      >
                        Publish
                      </button>
                    ) : (
                      <div />
                    )}
                    <button
                      className="p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                      aria-label="More options"
                    >
                      <Icon icon="solar:menu-dots-bold" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {paginatedPosts.length === 0 ? (
          <div className="text-center py-16 text-outline text-base">No posts found</div>
        ) : (
          paginatedPosts.map((post, idx) => {
            const globalIdx = (currentPage - 1) * POSTS_PER_PAGE + idx;
            return (
              <div
                key={post.id}
                className="bg-white rounded-2xl ghost-border p-5"
              >
                {/* Top row: thumbnail + title + kebab */}
                <div className="flex items-start gap-3.5 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                      thumbnailColors[globalIdx % thumbnailColors.length]
                    } flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon
                      icon={thumbnailIcons[globalIdx % thumbnailIcons.length]}
                      className="w-6 h-6 text-white"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-on-surface truncate">
                      {deriveTitle(post.content)}
                    </p>
                    <p className="text-sm text-outline mt-0.5">
                      Updated {updatedAgoLabels[globalIdx % updatedAgoLabels.length]}
                    </p>
                  </div>
                  <button
                    className="p-2 rounded-lg text-outline hover:text-on-surface"
                    aria-label="More options"
                  >
                    <Icon icon="solar:menu-dots-bold" className="w-5 h-5" />
                  </button>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-outline mb-4">
                  <span className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center ${
                        platformColors[post.platform]
                      }`}
                    >
                      <Icon
                        icon={getPlatformIcon(post.platform)}
                        className="w-3 h-3 text-white"
                      />
                    </span>
                    {platformLabels[post.platform]}
                  </span>
                  <span>
                    {post.status === 'draft'
                      ? 'No date set'
                      : `${formatDate(post.scheduledDate)} · ${formatTime(post.scheduledDate)}`}
                  </span>
                </div>

                {/* Bottom row: status + action */}
                <div className="flex items-center justify-between pt-4 border-t border-surface-container-high/50">
                  <StatusDot status={post.status} />
                  {post.status === 'draft' && (
                    <button
                      onClick={() => handlePublish(post.id)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary-600 transition-colors"
                    >
                      Publish
                    </button>
                  )}
                  {post.status === 'scheduled' && (
                    <button
                      className="p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                      aria-label="Edit post"
                    >
                      <Icon icon="solar:pen-2-bold" className="w-5 h-5" />
                    </button>
                  )}
                  {post.status === 'published' && (
                    <button
                      className="p-2 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
                      aria-label="View post"
                    >
                      <Icon icon="solar:eye-bold" className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {filteredPosts.length > POSTS_PER_PAGE && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-outline">
            Showing {(currentPage - 1) * POSTS_PER_PAGE + 1} to{' '}
            {Math.min(currentPage * POSTS_PER_PAGE, filteredPosts.length)} of{' '}
            {filteredPosts.length} posts
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <Icon icon="solar:alt-arrow-left-bold" className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === page
                    ? 'bg-primary text-white'
                    : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                }`}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <Icon icon="solar:alt-arrow-right-bold" className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
