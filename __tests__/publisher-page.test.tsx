import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PublisherPage from '../app/dashboard/publisher/page';
import { listPosts } from '@/lib/api/schedulerClient';
import { publishPost, type PublishLogRecord } from '@/lib/api/publisherClient';
import type { ScheduledPost } from '@/types/scheduler';

jest.mock('@/lib/api/schedulerClient', () => ({ listPosts: jest.fn() }));
jest.mock('@/lib/api/publisherClient', () => ({ publishPost: jest.fn() }));

const mockListPosts = listPosts as jest.MockedFunction<typeof listPosts>;
const mockPublishPost = publishPost as jest.MockedFunction<typeof publishPost>;

let seq = 0;
// Content is kept to four words or fewer so the derived title equals the content
const makePost = (overrides: Partial<ScheduledPost> = {}): ScheduledPost => {
  seq += 1;
  return {
    id: `post-${seq}`,
    strategyId: 'strategy-1',
    copyId: `copy-${seq}`,
    userId: 'user-1',
    content: `Post number ${seq}`,
    platform: 'linkedin',
    hashtags: [],
    scheduledDate: `2030-01-${String(seq).padStart(2, '0')}`,
    scheduledTime: '12:00',
    status: 'scheduled',
    strategyColor: '#4F46E5',
    strategyLabel: 'Launch',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
};

const renderPage = async () => {
  render(<PublisherPage />);
  await waitFor(() => expect(screen.queryByText('Loading posts...')).not.toBeInTheDocument());
};

// Each post is drawn twice in jsdom: once in the desktop list/grid and once in
// the mobile card list (CSS decides which is visible).
const isShown = (text: string) => screen.queryAllByText(text).length > 0;

describe('Publisher Page', () => {
  beforeEach(() => {
    seq = 0;
    jest.clearAllMocks();
    mockListPosts.mockResolvedValue([]);
  });

  it('shows the page title and description', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Content Pipeline' })).toBeInTheDocument();
    expect(screen.getByText('Manage and curate your cross-platform digital presence.')).toBeInTheDocument();
  });

  it('shows a loading state until the posts arrive', async () => {
    render(<PublisherPage />);
    expect(screen.getByText('Loading posts...')).toBeInTheDocument();

    await waitFor(() => expect(screen.queryByText('Loading posts...')).not.toBeInTheDocument());
  });

  it('says so when there are no posts', async () => {
    await renderPage();

    expect(screen.getAllByText('No posts found').length).toBeGreaterThan(0);
  });

  it('lists each post with its platform and status', async () => {
    mockListPosts.mockResolvedValue([
      makePost({ content: 'LinkedIn launch post', platform: 'linkedin', status: 'scheduled' }),
      makePost({ content: 'Instagram teaser', platform: 'instagram', status: 'published' }),
      makePost({ content: 'Twitter thread idea', platform: 'twitter', status: 'draft' }),
    ]);
    await renderPage();

    expect(isShown('LinkedIn launch post')).toBe(true);
    expect(isShown('Instagram teaser')).toBe(true);
    expect(isShown('Twitter thread idea')).toBe(true);
    expect(isShown('Twitter / X')).toBe(true);
    expect(isShown('Scheduled')).toBe(true);
    expect(isShown('Published')).toBe(true);
    expect(isShown('Draft')).toBe(true);
  });

  it('labels failed and publishing posts with their own status, not Draft', async () => {
    mockListPosts.mockResolvedValue([
      makePost({ content: 'Rejected by LinkedIn', status: 'failed' }),
      makePost({ content: 'Going out now', status: 'publishing' }),
    ]);
    await renderPage();

    expect(isShown('Failed')).toBe(true);
    expect(isShown('Publishing')).toBe(true);
    expect(isShown('Draft')).toBe(false);
  });

  it('shortens long content to a four-word title in the list', async () => {
    mockListPosts.mockResolvedValue([
      makePost({ content: 'Check out our brand new spring collection' }),
    ]);
    await renderPage();

    expect(isShown('Check out our brand...')).toBe(true);
  });

  it('shows drafts without a date', async () => {
    mockListPosts.mockResolvedValue([makePost({ status: 'draft' })]);
    await renderPage();

    expect(isShown('No date set')).toBe(true);
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('switches between list and grid views', async () => {
    mockListPosts.mockResolvedValue([makePost({ content: 'Check out our brand new spring collection' })]);
    await renderPage();

    const list = screen.getByRole('button', { name: 'List view' });
    const grid = screen.getByRole('button', { name: 'Grid view' });
    expect(list).toHaveAttribute('aria-pressed', 'true');
    expect(grid).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Content Snippet')).toBeInTheDocument();

    fireEvent.click(grid);
    expect(grid).toHaveAttribute('aria-pressed', 'true');
    expect(list).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Content Snippet')).not.toBeInTheDocument();
    // The grid card shows the full content rather than the short title
    expect(screen.getByText('Check out our brand new spring collection')).toBeInTheDocument();

    fireEvent.click(list);
    expect(list).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Content Snippet')).toBeInTheDocument();
  });

  describe('filters', () => {
    beforeEach(() => {
      mockListPosts.mockResolvedValue([
        makePost({ content: 'Scheduled on LinkedIn', platform: 'linkedin', status: 'scheduled' }),
        makePost({ content: 'Published on Instagram', platform: 'instagram', status: 'published' }),
        makePost({ content: 'Draft for Facebook', platform: 'facebook', status: 'draft' }),
      ]);
    });

    it('offers status and platform options', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));

      for (const name of ['Scheduled', 'Publishing', 'Published', 'Failed', 'Draft', 'LinkedIn', 'Instagram', 'Twitter / X', 'Facebook']) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument();
      }
      expect(screen.getAllByRole('button', { name: 'All' })).toHaveLength(2);
    });

    it('filters by status', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'Draft' }));

      expect(isShown('Draft for Facebook')).toBe(true);
      expect(isShown('Scheduled on LinkedIn')).toBe(false);
      expect(isShown('Published on Instagram')).toBe(false);
    });

    it('filters to failed posts', async () => {
      mockListPosts.mockResolvedValue([
        makePost({ content: 'Scheduled on LinkedIn', status: 'scheduled' }),
        makePost({ content: 'Rejected by LinkedIn', status: 'failed' }),
      ]);
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'Failed' }));

      expect(isShown('Rejected by LinkedIn')).toBe(true);
      expect(isShown('Scheduled on LinkedIn')).toBe(false);
    });

    it('filters by platform', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'Instagram' }));

      expect(isShown('Published on Instagram')).toBe(true);
      expect(isShown('Scheduled on LinkedIn')).toBe(false);
      expect(isShown('Draft for Facebook')).toBe(false);
    });

    it('combines filters and says when nothing matches', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'Published' }));
      fireEvent.click(screen.getByRole('button', { name: 'Facebook' }));

      expect(screen.getAllByText('No posts found').length).toBeGreaterThan(0);
    });

    it('clears all filters', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      expect(screen.queryByRole('button', { name: 'Clear all filters' })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Draft' }));
      fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

      expect(isShown('Draft for Facebook')).toBe(true);
      expect(isShown('Scheduled on LinkedIn')).toBe(true);
      expect(isShown('Published on Instagram')).toBe(true);
    });
  });

  describe('publishing', () => {
    it('offers Publish only for unpublished LinkedIn posts', async () => {
      mockListPosts.mockResolvedValue([
        makePost({ content: 'LinkedIn scheduled', platform: 'linkedin', status: 'scheduled' }),
        makePost({ content: 'LinkedIn draft', platform: 'linkedin', status: 'draft' }),
        makePost({ content: 'LinkedIn published', platform: 'linkedin', status: 'published' }),
        makePost({ content: 'Instagram scheduled', platform: 'instagram', status: 'scheduled' }),
      ]);
      await renderPage();

      expect(screen.getByRole('button', { name: 'Publish post: LinkedIn scheduled' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Publish post: LinkedIn draft' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Publish post: LinkedIn published' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Publish post: Instagram scheduled' })).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: 'View post' }).length).toBeGreaterThan(0);
    });

    it('publishes a post and shows its new status', async () => {
      const post = makePost({ content: 'Ready to go', status: 'draft' });
      mockListPosts.mockResolvedValueOnce([post]).mockResolvedValueOnce([{ ...post, status: 'published' }]);
      mockPublishPost.mockResolvedValue({} as PublishLogRecord);
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Publish post: Ready to go' }));

      await waitFor(() => expect(isShown('Published')).toBe(true));
      expect(mockPublishPost).toHaveBeenCalledWith(post.id);
      expect(isShown('Draft')).toBe(false);
      expect(screen.queryByRole('button', { name: 'Publish post: Ready to go' })).not.toBeInTheDocument();
    });

    it('shows a dismissible error when publishing fails', async () => {
      mockListPosts.mockResolvedValue([makePost({ content: 'Ready to go' })]);
      mockPublishPost.mockRejectedValue(new Error('LinkedIn token expired'));
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Publish post: Ready to go' }));

      expect(await screen.findByText('LinkedIn token expired')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Publish post: Ready to go' })).toBeEnabled();

      fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
      expect(screen.queryByText('LinkedIn token expired')).not.toBeInTheDocument();
    });
  });

  it('shows an error when the posts cannot be loaded', async () => {
    mockListPosts.mockRejectedValue(new Error('Scheduler is down'));
    await renderPage();

    expect(screen.getByText('Scheduler is down')).toBeInTheDocument();
  });

  describe('pagination', () => {
    beforeEach(() => {
      mockListPosts.mockResolvedValue(Array.from({ length: 12 }, () => makePost()));
    });

    it('shows ten posts per page in date order', async () => {
      await renderPage();

      expect(screen.getByText('Showing 1 to 10 of 12 posts')).toBeInTheDocument();
      expect(isShown('Post number 1')).toBe(true);
      expect(isShown('Post number 10')).toBe(true);
      expect(isShown('Post number 11')).toBe(false);

      expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    });

    it('moves between pages', async () => {
      await renderPage();

      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
      expect(screen.getByText('Showing 11 to 12 of 12 posts')).toBeInTheDocument();
      expect(isShown('Post number 11')).toBe(true);
      expect(isShown('Post number 1')).toBe(false);
      expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
      expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
      expect(screen.getByText('Showing 1 to 10 of 12 posts')).toBeInTheDocument();
    });

    it('returns to the first page when a filter changes', async () => {
      await renderPage();
      fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

      fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
      fireEvent.click(screen.getByRole('button', { name: 'Scheduled' }));

      expect(screen.getByText('Showing 1 to 10 of 12 posts')).toBeInTheDocument();
    });

    it('hides pagination when everything fits on one page', async () => {
      mockListPosts.mockResolvedValue([makePost(), makePost()]);
      await renderPage();

      expect(screen.queryByText(/Showing \d+ to/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Page 1' })).not.toBeInTheDocument();
    });
  });
});
