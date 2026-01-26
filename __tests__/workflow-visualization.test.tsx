/**
 * Workflow Visualization Integration Tests
 * Task 14.5: Test workflow visualization
 * 
 * Tests:
 * - Navigate to /dashboard/strategist and verify workflow displays at top
 * - Verify Strategist is highlighted
 * - Navigate to other agent pages and verify highlighting updates
 * - Navigate to /dashboard/analysis and verify workflow is hidden
 * 
 * Requirements: 11.1, 11.6
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AgentProvider } from '@/context/AgentContext';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

// Mock iconify
jest.mock('@iconify/react', () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid={`icon-${icon}`} className={className} />
  ),
}));

describe('Task 14.5: Workflow Visualization Tests', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Strategist Page - Workflow Display', () => {
    it('should display workflow at top when on /dashboard/strategist', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true} title="AI Strategy Generator">
            <div>Strategist Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is displayed
      expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
      
      // Verify all workflow steps are present (using getAllByText since there are desktop and mobile versions)
      expect(screen.getAllByText('Strategist').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Copywriter').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Scheduler').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Designer').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Publisher').length).toBeGreaterThan(0);
    });

    it('should highlight Strategist when on /dashboard/strategist', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Strategist is highlighted with blue text (there are 2 instances: desktop and mobile)
      const strategistTexts = screen.getAllByText('Strategist');
      expect(strategistTexts[0]).toHaveClass('text-blue-600');
    });

    it('should display Strategist icon with active styling', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      const { container } = render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Strategist icon is present (there are 2 instances: desktop and mobile)
      const icons = screen.getAllByTestId('icon-solar:lightbulb-bolt-bold');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Copywriter Page - Workflow Display', () => {
    it('should display workflow when on /dashboard/copywriter', () => {
      mockUsePathname.mockReturnValue('/dashboard/copywriter');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true} title="AI Copywriter">
            <div>Copywriter Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is displayed
      expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
    });

    it('should highlight Copywriter when on /dashboard/copywriter', () => {
      mockUsePathname.mockReturnValue('/dashboard/copywriter');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Copywriter is highlighted (there are 2 instances: desktop and mobile)
      const copywriterTexts = screen.getAllByText('Copywriter');
      expect(copywriterTexts[0]).toHaveClass('text-blue-600');
      
      // Verify Strategist is NOT highlighted
      const strategistTexts = screen.getAllByText('Strategist');
      expect(strategistTexts[0]).not.toHaveClass('text-blue-600');
      expect(strategistTexts[0]).toHaveClass('text-gray-700');
    });
  });

  describe('Scheduler Page - Workflow Display', () => {
    it('should display workflow when on /dashboard/scheduler', () => {
      mockUsePathname.mockReturnValue('/dashboard/scheduler');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true} title="Content Scheduler">
            <div>Scheduler Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is displayed
      expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
    });

    it('should highlight Scheduler when on /dashboard/scheduler', () => {
      mockUsePathname.mockReturnValue('/dashboard/scheduler');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Scheduler is highlighted (there are 2 instances: desktop and mobile)
      const schedulerTexts = screen.getAllByText('Scheduler');
      expect(schedulerTexts[0]).toHaveClass('text-blue-600');
    });
  });

  describe('Designer Page - Workflow Display', () => {
    it('should display workflow when on /dashboard/designer', () => {
      mockUsePathname.mockReturnValue('/dashboard/designer');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true} title="AI Image Designer">
            <div>Designer Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is displayed
      expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
    });

    it('should highlight Designer when on /dashboard/designer', () => {
      mockUsePathname.mockReturnValue('/dashboard/designer');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Designer is highlighted (there are 2 instances: desktop and mobile)
      const designerTexts = screen.getAllByText('Designer');
      expect(designerTexts[0]).toHaveClass('text-blue-600');
    });
  });

  describe('Publisher Page - Workflow Display', () => {
    it('should display workflow when on /dashboard/publisher', () => {
      mockUsePathname.mockReturnValue('/dashboard/publisher');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true} title="Content Publisher">
            <div>Publisher Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is displayed
      expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
    });

    it('should highlight Publisher when on /dashboard/publisher', () => {
      mockUsePathname.mockReturnValue('/dashboard/publisher');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Publisher is highlighted (there are 2 instances: desktop and mobile)
      const publisherTexts = screen.getAllByText('Publisher');
      expect(publisherTexts.length).toBeGreaterThan(0);
      expect(publisherTexts[0]).toHaveClass('text-blue-600');
    });
  });

  describe('Analysis Page - Workflow Hidden', () => {
    it('should NOT display workflow when on /dashboard/analysis', () => {
      mockUsePathname.mockReturnValue('/dashboard/analysis');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={false} title="Analytics Dashboard">
            <div>Analysis Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is NOT displayed
      expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();
      
      // Verify page title is still displayed
      expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
    });

    it('should display page content without workflow on /dashboard/analysis', () => {
      mockUsePathname.mockReturnValue('/dashboard/analysis');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={false}>
            <div>Analysis metrics and charts</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify content is displayed
      expect(screen.getByText('Analysis metrics and charts')).toBeInTheDocument();
      
      // Verify workflow steps are not present
      expect(screen.queryByText('Strategist')).not.toBeInTheDocument();
      expect(screen.queryByText('Copywriter')).not.toBeInTheDocument();
    });
  });

  describe('Profile Page - Workflow Hidden', () => {
    it('should NOT display workflow when on /dashboard/profile', () => {
      mockUsePathname.mockReturnValue('/dashboard/profile');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={false} title="Profile Settings">
            <div>Profile Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify workflow is NOT displayed
      expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();
      
      // Verify page title is still displayed
      expect(screen.getByText('Profile Settings')).toBeInTheDocument();
    });
  });

  describe('Workflow Navigation Flow', () => {
    it('should update highlighting when navigating between agent pages', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      const { rerender } = render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Initially on Strategist (there are 2 instances: desktop and mobile)
      const strategistTexts = screen.getAllByText('Strategist');
      expect(strategistTexts[0]).toHaveClass('text-blue-600');

      // Navigate to Copywriter
      mockUsePathname.mockReturnValue('/dashboard/copywriter');
      rerender(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify Copywriter is now highlighted
      const copywriterTexts = screen.getAllByText('Copywriter');
      expect(copywriterTexts[0]).toHaveClass('text-blue-600');
      
      const strategistTextsAfter = screen.getAllByText('Strategist');
      expect(strategistTextsAfter[0]).toHaveClass('text-gray-700');
    });

    it('should show all workflow steps on any agent page', () => {
      const agentPages = [
        '/dashboard/strategist',
        '/dashboard/copywriter',
        '/dashboard/scheduler',
        '/dashboard/designer',
        '/dashboard/publisher',
      ];

      agentPages.forEach((page) => {
        mockUsePathname.mockReturnValue(page);

        const { unmount } = render(
          <AgentProvider>
            <PageWrapper showWorkflow={true}>
              <div>Content</div>
            </PageWrapper>
          </AgentProvider>
        );

        // Verify all 5 workflow steps are present (using getAllByText since there are desktop and mobile versions)
        expect(screen.getAllByText('Strategist').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Copywriter').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Scheduler').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Designer').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Publisher').length).toBeGreaterThan(0);

        unmount();
      });
    });
  });

  describe('Workflow Visual Elements', () => {
    it('should display arrows between workflow steps on desktop', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify arrow icons are present (4 arrows between 5 steps)
      const arrows = screen.getAllByTestId('icon-solar:arrow-right-bold');
      expect(arrows.length).toBeGreaterThan(0);
    });

    it('should display status badges for each agent', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Verify status badges are displayed (all should start as "Not Started")
      // There are 10 badges total: 5 for desktop layout + 5 for mobile layout
      const statusBadges = screen.getAllByText('Not Started');
      expect(statusBadges.length).toBe(10);
    });

    it('should display workflow in a card with border and shadow', () => {
      mockUsePathname.mockReturnValue('/dashboard/strategist');

      const { container } = render(
        <AgentProvider>
          <PageWrapper showWorkflow={true}>
            <div>Content</div>
          </PageWrapper>
        </AgentProvider>
      );

      // Find the workflow container
      const workflowTitle = screen.getByText('Agent Workflow');
      const workflowContainer = workflowTitle.closest('div');
      
      // Verify it has the expected styling classes
      expect(workflowContainer).toHaveClass('bg-white');
      expect(workflowContainer).toHaveClass('rounded-lg');
      expect(workflowContainer).toHaveClass('shadow-sm');
    });
  });

  describe('Requirement Validation', () => {
    it('validates Requirement 11.1: Workflow displays on agent pages', () => {
      const agentPages = [
        '/dashboard/strategist',
        '/dashboard/copywriter',
        '/dashboard/scheduler',
        '/dashboard/designer',
        '/dashboard/publisher',
      ];

      agentPages.forEach((page) => {
        mockUsePathname.mockReturnValue(page);

        const { unmount } = render(
          <AgentProvider>
            <PageWrapper showWorkflow={true}>
              <div>Content</div>
            </PageWrapper>
          </AgentProvider>
        );

        // Requirement 11.1: Workflow visualization should be displayed
        expect(screen.getByText('Agent Workflow')).toBeInTheDocument();

        unmount();
      });
    });

    it('validates Requirement 11.6: Workflow hidden on Analysis and Profile pages', () => {
      const nonAgentPages = [
        '/dashboard/analysis',
        '/dashboard/profile',
      ];

      nonAgentPages.forEach((page) => {
        mockUsePathname.mockReturnValue(page);

        const { unmount } = render(
          <AgentProvider>
            <PageWrapper showWorkflow={false}>
              <div>Content</div>
            </PageWrapper>
          </AgentProvider>
        );

        // Requirement 11.6: Workflow should NOT be displayed
        expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();

        unmount();
      });
    });
  });
});
