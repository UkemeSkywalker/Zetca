import React from 'react';
import { render, screen, within } from '@testing-library/react';
import AnalysisPage from '@/app/dashboard/analysis/page';
import mockAnalytics from '@/data/mockAnalytics.json';

jest.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/analysis',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

describe('Analysis Page', () => {
  beforeEach(() => {
    render(<AnalysisPage />);
  });

  it('shows the page heading', () => {
    expect(screen.getByRole('heading', { level: 1, name: 'Analytics Dashboard' })).toBeInTheDocument();
  });

  it('does not show the agent workflow', () => {
    expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();
  });

  it('shows every metric with its value and the size of its change', () => {
    mockAnalytics.metrics.forEach((metric) => {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
      expect(screen.getByText(metric.value)).toBeInTheDocument();
      expect(screen.getByText(`${Math.abs(metric.change)}%`)).toBeInTheDocument();
    });
  });

  it('shows the engagement trends chart', () => {
    expect(screen.getByRole('heading', { name: 'Engagement Trends' })).toBeInTheDocument();
    expect(screen.queryByText('No data available')).not.toBeInTheDocument();
  });

  it('shows a card for each platform with posts, engagement and reach', () => {
    expect(screen.getByRole('heading', { name: 'Platform Performance' })).toBeInTheDocument();

    for (const name of ['Instagram', 'Twitter', 'LinkedIn', 'Facebook']) {
      expect(screen.getByRole('heading', { level: 4, name })).toBeInTheDocument();
    }
    const count = mockAnalytics.platformPerformance.length;
    expect(screen.getAllByText('Posts')).toHaveLength(count);
    expect(screen.getAllByText('Engagement')).toHaveLength(count);
    expect(screen.getAllByText('Reach')).toHaveLength(count);
  });

  it('lists the top posts in rank order with platform, engagement and reach', () => {
    expect(screen.getByRole('heading', { name: 'Top Performing Posts' })).toBeInTheDocument();

    mockAnalytics.topPosts.forEach((post, index) => {
      const content = screen.getByText(post.content);
      // The post's row is the element that holds both its rank and its metrics
      const row = content.parentElement!.parentElement!;

      expect(within(row).getByText(String(index + 1))).toBeInTheDocument();
      expect(within(row).getByText(post.platform)).toBeInTheDocument();
      expect(within(row).getByText(post.engagement.toLocaleString())).toBeInTheDocument();
      expect(within(row).getByText(post.reach.toLocaleString())).toBeInTheDocument();
    });
  });
});
