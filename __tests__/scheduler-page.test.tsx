import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPage from '../app/dashboard/scheduler/page';
import * as schedulerClient from '@/lib/api/schedulerClient';
import { listStrategies } from '@/lib/api/strategyClient';
import type { ScheduledPost } from '@/types/scheduler';
import type { StrategyRecord } from '@/types/strategy';

jest.mock('@/lib/api/schedulerClient', () => ({
  SchedulerAPIError: jest.requireActual('@/lib/api/schedulerClient').SchedulerAPIError,
  listPosts: jest.fn(),
  manualSchedule: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  deleteAllPosts: jest.fn(),
  autoSchedule: jest.fn(),
}));
jest.mock('@/lib/api/strategyClient', () => ({ listStrategies: jest.fn() }));
jest.mock('@/lib/api/mediaClient', () => ({ getDownloadUrl: jest.fn() }));
jest.mock('@/lib/api/copyClient', () => ({ refineText: jest.fn() }));

const api = schedulerClient as jest.Mocked<typeof schedulerClient>;
const mockListStrategies = listStrategies as jest.MockedFunction<typeof listStrategies>;

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const utcDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const utcTime = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

/** A local date/time a few days ahead, at 10:00 */
const futureAt10 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(10, 0, 0, 0);
  return d;
};

const makePost = (overrides: Partial<ScheduledPost> = {}): ScheduledPost => {
  const when = futureAt10();
  return {
    id: 'post-1',
    strategyId: 'strategy-1',
    copyId: 'copy-1',
    userId: 'user-1',
    content: 'Launch day is almost here',
    platform: 'linkedin',
    hashtags: [],
    scheduledDate: utcDate(when),
    scheduledTime: utcTime(when),
    status: 'scheduled',
    strategyColor: '#4F46E5',
    strategyLabel: 'Launch',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
};

const renderPage = async () => {
  render(<SchedulerPage />);
  await waitFor(() => expect(screen.queryByText('Loading scheduled posts...')).not.toBeInTheDocument());
};

const openScheduleDialog = () => {
  fireEvent.click(screen.getAllByRole('button', { name: 'Schedule Post' })[0]);
  return screen.getByRole('dialog');
};

describe('Scheduler Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    api.listPosts.mockResolvedValue([]);
    mockListStrategies.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the page title and description', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Content Scheduler' })).toBeInTheDocument();
    expect(screen.getByText('Schedule your social media posts across different platforms')).toBeInTheDocument();
    expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();
  });

  it('shows an empty state in the default grid view when nothing is scheduled', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { name: 'No scheduled posts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Schedule Your First Post' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear All' })).not.toBeInTheDocument();
  });

  it('lists scheduled posts grouped under their local date', async () => {
    const post = makePost();
    api.listPosts.mockResolvedValue([post]);
    await renderPage();

    const when = futureAt10();
    const dayHeading = when.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    expect(screen.getByRole('heading', { name: dayHeading })).toBeInTheDocument();
    expect(screen.getByText('1 post scheduled')).toBeInTheDocument();
    expect(screen.getByText(post.content)).toBeInTheDocument();
    expect(screen.getByText('10:00 AM')).toBeInTheDocument();
  });

  it('switches between the grid and calendar views', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));

    const now = new Date();
    const monthYear = `${now.toLocaleDateString('en-US', { month: 'long' })} ${now.getFullYear()}`;
    expect(screen.getByText(monthYear)).toBeInTheDocument();
    expect(screen.queryByText('No scheduled posts')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    expect(
      screen.getByText(`${next.toLocaleDateString('en-US', { month: 'long' })} ${next.getFullYear()}`)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Grid' }));
    expect(screen.getByText('No scheduled posts')).toBeInTheDocument();
  });

  it('shows the posts for a calendar day when that day is clicked', async () => {
    const post = makePost();
    api.listPosts.mockResolvedValue([post]);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    const when = futureAt10();
    if (when.getMonth() !== new Date().getMonth()) {
      fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    }
    // The calendar shows the post on its day, with the text in a tooltip
    fireEvent.click(screen.getByTitle(`${post.strategyLabel}: ${post.content}`));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Scheduled for')).toBeInTheDocument();
    expect(within(dialog).getByText(post.content)).toBeInTheDocument();
  });

  it('opens a calendar day from the keyboard', async () => {
    const post = makePost();
    api.listPosts.mockResolvedValue([post]);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    const when = futureAt10();
    if (when.getMonth() !== new Date().getMonth()) {
      fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    }
    const dayName = when.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const day = screen.getByRole('button', { name: `${dayName}, 1 post` });
    expect(day).toHaveAttribute('tabIndex', '0');

    fireEvent.keyDown(day, { key: 'Enter' });

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(post.content)).toBeInTheDocument();
  });

  it('offers a retry when the posts cannot be loaded', async () => {
    api.listPosts.mockRejectedValueOnce(new schedulerClient.SchedulerAPIError('Scheduler is down', 503));
    await renderPage();

    expect(screen.getByRole('heading', { name: 'Unable to load posts' })).toBeInTheDocument();
    expect(screen.getByText('Scheduler is down')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));
    expect(await screen.findByText('No scheduled posts')).toBeInTheDocument();
    expect(api.listPosts).toHaveBeenCalledTimes(2);
  });

  describe('scheduling dialog', () => {
    it('opens with labelled fields and closes from Cancel, Close and Escape', async () => {
      await renderPage();

      let dialog = openScheduleDialog();
      expect(dialog).toHaveAccessibleName('Craft Your Post');
      expect(within(dialog).getByRole('heading', { name: 'Craft Your Post' })).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Post Copy')).toBeInTheDocument();
      expect(within(dialog).getByLabelText('Date')).toHaveValue(localDate(new Date()));
      expect(within(dialog).getByLabelText('Time')).toHaveValue('09:00');

      fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      dialog = openScheduleDialog();
      fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      openScheduleDialog();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('requires content before scheduling', async () => {
      await renderPage();
      const dialog = openScheduleDialog();

      fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule Post' }));

      expect(await within(dialog).findByText('Content is required')).toBeInTheDocument();
      expect(api.manualSchedule).not.toHaveBeenCalled();
    });

    it('rejects a time in the past', async () => {
      await renderPage();
      const dialog = openScheduleDialog();

      fireEvent.change(within(dialog).getByLabelText('Post Copy'), { target: { value: 'Hello' } });
      fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: '2020-01-01' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule Post' }));

      expect(await within(dialog).findByText('Must be in the future')).toBeInTheDocument();
      expect(api.manualSchedule).not.toHaveBeenCalled();
    });

    it('counts characters against the chosen platform’s limit', async () => {
      await renderPage();
      const dialog = openScheduleDialog();

      fireEvent.change(within(dialog).getByLabelText('Post Copy'), { target: { value: 'Hello' } });
      expect(within(dialog).getByText('5 / 3,000 characters')).toBeInTheDocument();

      expect(within(dialog).getByRole('button', { name: 'LinkedIn' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(dialog).getByRole('button', { name: 'X' })).toHaveAttribute('aria-pressed', 'false');

      fireEvent.click(within(dialog).getByRole('button', { name: 'X' }));
      expect(within(dialog).getByText('5 / 280 characters')).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'X' })).toHaveAttribute('aria-pressed', 'true');
      expect(within(dialog).getByRole('button', { name: 'LinkedIn' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('schedules a post in UTC for the chosen platform and shows it', async () => {
      const when = futureAt10();
      const created = makePost({ id: 'new', content: 'A brand new post', platform: 'twitter' });
      api.manualSchedule.mockResolvedValue(created);
      await renderPage();
      api.listPosts.mockResolvedValue([created]);

      const dialog = openScheduleDialog();
      fireEvent.change(within(dialog).getByLabelText('Post Copy'), { target: { value: '  A brand new post  ' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'X' }));
      fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: localDate(when) } });
      fireEvent.change(within(dialog).getByLabelText('Time'), { target: { value: '10:00' } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule Post' }));

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      expect(api.manualSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'A brand new post',
          platform: 'twitter',
          scheduledDate: utcDate(when),
          scheduledTime: utcTime(when),
        })
      );
      expect(await screen.findByText('A brand new post')).toBeInTheDocument();
    });

    it('shows the API’s error when scheduling fails', async () => {
      api.manualSchedule.mockRejectedValue(new schedulerClient.SchedulerAPIError('Quota reached', 429));
      await renderPage();

      const dialog = openScheduleDialog();
      fireEvent.change(within(dialog).getByLabelText('Post Copy'), { target: { value: 'Hello' } });
      fireEvent.change(within(dialog).getByLabelText('Date'), { target: { value: localDate(futureAt10()) } });
      fireEvent.click(within(dialog).getByRole('button', { name: 'Schedule Post' }));

      expect(await screen.findByText('Quota reached')).toBeInTheDocument();
    });
  });

  it('edits a post with its current details filled in', async () => {
    const post = makePost();
    api.listPosts.mockResolvedValue([post]);
    api.updatePost.mockResolvedValue({ ...post, content: 'Edited copy' });
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Edit post' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Refine Your Narrative' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Post Copy')).toHaveValue(post.content);
    expect(within(dialog).getByLabelText('Date')).toHaveValue(localDate(futureAt10()));
    expect(within(dialog).getByLabelText('Time')).toHaveValue('10:00');

    fireEvent.change(within(dialog).getByLabelText('Post Copy'), { target: { value: 'Edited copy' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Update Post' }));

    await waitFor(() =>
      expect(api.updatePost).toHaveBeenCalledWith(
        post.id,
        expect.objectContaining({
          content: 'Edited copy',
          scheduledDate: post.scheduledDate,
          scheduledTime: post.scheduledTime,
          status: 'scheduled',
        })
      )
    );
    expect(api.manualSchedule).not.toHaveBeenCalled();
  });

  it('deletes a post and reloads the list', async () => {
    const post = makePost();
    api.listPosts.mockResolvedValueOnce([post]).mockResolvedValueOnce([]);
    api.deletePost.mockResolvedValue();
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Delete post' }));

    expect(await screen.findByText('No scheduled posts')).toBeInTheDocument();
    expect(api.deletePost).toHaveBeenCalledWith(post.id);
  });

  it('clears every post only after confirmation', async () => {
    api.listPosts.mockResolvedValue([makePost(), makePost({ id: 'post-2', content: 'Second post' })]);
    api.deleteAllPosts.mockResolvedValue(2);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    expect(screen.getByRole('heading', { name: 'Clear all posts?' })).toBeInTheDocument();
    expect(screen.getByText(/permanently delete all 2 scheduled posts/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Clear all posts?' })).not.toBeInTheDocument();
    expect(api.deleteAllPosts).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));
    const confirm = screen.getAllByRole('button', { name: 'Clear All' }).at(-1)!;
    fireEvent.click(confirm);

    expect(await screen.findByText('No scheduled posts')).toBeInTheDocument();
    expect(api.deleteAllPosts).toHaveBeenCalledTimes(1);
  });

  it('auto-schedules from a chosen strategy', async () => {
    mockListStrategies.mockResolvedValue([
      { id: 'strategy-1', brandName: 'Acme Coffee' } as StrategyRecord,
    ]);
    api.autoSchedule.mockResolvedValue([]);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Auto Schedule' }));
    expect(await screen.findByText('Select a strategy')).toBeInTheDocument();

    api.listPosts.mockResolvedValue([makePost({ content: 'Fresh from the strategy' })]);
    fireEvent.click(screen.getByRole('button', { name: 'Acme Coffee' }));

    expect(await screen.findByText('Fresh from the strategy')).toBeInTheDocument();
    expect(api.autoSchedule).toHaveBeenCalledWith('strategy-1');
  });

  it('tells the user when there are no strategies to auto-schedule from', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Auto Schedule' }));

    expect(await screen.findByText('No strategies found')).toBeInTheDocument();
  });

  it('offers a retry when auto-scheduling fails', async () => {
    mockListStrategies.mockResolvedValue([
      { id: 'strategy-1', brandName: 'Acme Coffee' } as StrategyRecord,
    ]);
    api.autoSchedule
      .mockRejectedValueOnce(new schedulerClient.SchedulerAPIError('No copies to schedule', 400))
      .mockResolvedValueOnce([]);
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Auto Schedule' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Acme Coffee' }));

    expect(await screen.findByText('No copies to schedule')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.queryByText('No copies to schedule')).not.toBeInTheDocument());
    expect(api.autoSchedule).toHaveBeenCalledTimes(2);
  });

  it('dismisses the auto-schedule error from its labelled close button', async () => {
    mockListStrategies.mockResolvedValue([
      { id: 'strategy-1', brandName: 'Acme Coffee' } as StrategyRecord,
    ]);
    api.autoSchedule.mockRejectedValue(new schedulerClient.SchedulerAPIError('No copies to schedule', 400));
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Auto Schedule' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Acme Coffee' }));
    expect(await screen.findByText('No copies to schedule')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));

    expect(screen.queryByText('No copies to schedule')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
