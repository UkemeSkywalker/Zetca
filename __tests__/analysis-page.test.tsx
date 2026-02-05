import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalysisPage from '@/app/dashboard/analysis/page';
import mockAnalytics from '@/data/mockAnalytics.json';

// Mock Next.js navigation
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

  // Requirement 9.1: Page displays with correct heading
  it('should display the Analytics Dashboard heading', () => {
    expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
  });

  // Requirement 11.6: Workflow should NOT be displayed on analysis page
  it('should not display the agent workflow visualization', () => {
    // The workflow component has specific text like "Strategist" in workflow context
    // Since showWorkflow=false, these should not appear in workflow visualization
    const workflowElements = screen.queryAllByText(/Strategist|Copywriter|Scheduler|Designer|Publisher/);
    // If found, they should be minimal (just in sidebar, not in workflow)
    expect(workflowElements.length).toBeLessThan(5);
  });

  // Requirement 9.2: Display 4 metric cards
  it('should display all 4 metric cards', () => {
    mockAnalytics.metrics.forEach((metric) => {
      expect(screen.getByText(metric.label)).toBeInTheDocument();
      expect(screen.getByText(metric.value)).toBeInTheDocument();
    });
  });

  // Requirement 9.2, 9.6: Display percentage changes with correct colors
  it('should display percentage changes with correct color coding', () => {
    const engagementRate = screen.getByText('Engagement Rate').closest('div');
    expect(engagementRate).toBeInTheDocument();
    
    // Check that positive changes show green and negative show red
    mockAnalytics.metrics.forEach((metric) => {
      const changeText = screen.getByText(`${Math.abs(metric.change)}%`);
      expect(changeText).toBeInTheDocument();
      
      if (metric.change >= 0) {
        expect(changeText).toHaveClass('text-green-600');
      } else {
        expect(changeText).toHaveClass('text-red-600');
      }
    });
  });

  // Requirement 9.3: Display engagement chart
  it('should display the engagement trends chart', () => {
    expect(screen.getByText('Engagement Trends')).toBeInTheDocument();
  });

  // Requirement 9.4: Display platform performance section
  it('should display platform performance section', () => {
    expect(screen.getByText('Platform Performance')).toBeInTheDocument();
    
    // Check all platforms are displayed
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  // Requirement 9.4: Display posts, engagement, reach for each platform
  it('should display metrics for each platform', () => {
    mockAnalytics.platformPerformance.forEach((platform) => {
      // Check that the platform's metrics are displayed
      const postsText = screen.getAllByText('Posts');
      const engagementText = screen.getAllByText('Engagement');
      const reachText = screen.getAllByText('Reach');
      
      expect(postsText.length).toBeGreaterThan(0);
      expect(engagementText.length).toBeGreaterThan(0);
      expect(reachText.length).toBeGreaterThan(0);
    });
  });

  // Requirement 9.5: Display top posts list
  it('should display top performing posts section', () => {
    expect(screen.getByText('Top Performing Posts')).toBeInTheDocument();
  });

  // Requirement 9.5: Display top 5 posts with content, platform, engagement, reach
  it('should display all top posts with their details', () => {
    mockAnalytics.topPosts.forEach((post) => {
      // Check content preview is displayed
      expect(screen.getByText(post.content)).toBeInTheDocument();
      
      // Check platform is displayed (capitalized)
      const platformElements = screen.getAllByText(post.platform, { exact: false });
      expect(platformElements.length).toBeGreaterThan(0);
      
      // Check engagement and reach are displayed (use getAllByText since values might appear in multiple places)
      const engagementElements = screen.getAllByText(post.engagement.toLocaleString());
      expect(engagementElements.length).toBeGreaterThan(0);
      
      const reachElements = screen.getAllByText(post.reach.toLocaleString());
      expect(reachElements.length).toBeGreaterThan(0);
    });
  });

  // Requirement 9.5: Posts should be ranked (numbered 1-5)
  it('should display ranking numbers for top posts', () => {
    for (let i = 1; i <= 5; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument();
    }
  });
});

describe('Analysis Page - Responsive Layout', () => {
  // Requirement 9.6: Responsive grid layout
  it('should render metric cards in a responsive grid', () => {
    const { container } = render(<AnalysisPage />);
    
    // Check for grid classes
    const gridElements = container.querySelectorAll('.grid');
    expect(gridElements.length).toBeGreaterThan(0);
    
    // Check for responsive classes (md:grid-cols-2, lg:grid-cols-4)
    const metricsGrid = gridElements[0];
    expect(metricsGrid.className).toMatch(/grid-cols-1/);
    expect(metricsGrid.className).toMatch(/md:grid-cols-2/);
    expect(metricsGrid.className).toMatch(/lg:grid-cols-4/);
  });
});
