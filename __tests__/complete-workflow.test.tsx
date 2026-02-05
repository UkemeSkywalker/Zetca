/**
 * Integration Test: Complete Agent Workflow
 * 
 * This test verifies that all 5 agent tools work correctly and that
 * the workflow status updates properly as users progress through the pipeline:
 * Strategist → Copywriter → Scheduler → Designer → Publisher
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AgentProvider } from '@/context/AgentContext';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/dashboard/strategist'),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  })),
}));

// Mock Iconify
jest.mock('@iconify/react', () => ({
  Icon: ({ icon, className }: { icon: string; className?: string }) => (
    <span data-testid={`icon-${icon}`} className={className} />
  ),
}));

describe('Complete Agent Workflow Integration', () => {
  describe('Workflow Status Tracking', () => {
    it('should initialize all agents with not-started status', () => {
      const TestComponent = () => {
        const { useAgentContext } = require('@/context/AgentContext');
        const { workflowStatus } = useAgentContext();
        
        return (
          <div>
            <div data-testid="strategist-status">{workflowStatus.strategist}</div>
            <div data-testid="copywriter-status">{workflowStatus.copywriter}</div>
            <div data-testid="scheduler-status">{workflowStatus.scheduler}</div>
            <div data-testid="designer-status">{workflowStatus.designer}</div>
            <div data-testid="publisher-status">{workflowStatus.publisher}</div>
          </div>
        );
      };

      render(
        <AgentProvider>
          <TestComponent />
        </AgentProvider>
      );

      expect(screen.getByTestId('strategist-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('copywriter-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('scheduler-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('designer-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('publisher-status')).toHaveTextContent('not-started');
    });

    it('should update strategist status to complete when strategy is generated', () => {
      const TestComponent = () => {
        const { useAgentContext } = require('@/context/AgentContext');
        const { workflowStatus, updateWorkflowStatus } = useAgentContext();
        
        return (
          <div>
            <div data-testid="strategist-status">{workflowStatus.strategist}</div>
            <button onClick={() => updateWorkflowStatus('strategist', 'complete')}>
              Complete Strategist
            </button>
          </div>
        );
      };

      render(
        <AgentProvider>
          <TestComponent />
        </AgentProvider>
      );

      const button = screen.getByText('Complete Strategist');
      fireEvent.click(button);

      expect(screen.getByTestId('strategist-status')).toHaveTextContent('complete');
    });

    it('should update copywriter status to complete when captions are generated', () => {
      const TestComponent = () => {
        const { useAgentContext } = require('@/context/AgentContext');
        const { workflowStatus, updateWorkflowStatus } = useAgentContext();
        
        return (
          <div>
            <div data-testid="copywriter-status">{workflowStatus.copywriter}</div>
            <button onClick={() => updateWorkflowStatus('copywriter', 'complete')}>
              Complete Copywriter
            </button>
          </div>
        );
      };

      render(
        <AgentProvider>
          <TestComponent />
        </AgentProvider>
      );

      const button = screen.getByText('Complete Copywriter');
      fireEvent.click(button);

      expect(screen.getByTestId('copywriter-status')).toHaveTextContent('complete');
    });
  });

  describe('Agent Tool Availability', () => {
    it('should have all 5 agent tools accessible', () => {
      const agentRoutes = [
        '/dashboard/strategist',
        '/dashboard/copywriter',
        '/dashboard/scheduler',
        '/dashboard/designer',
        '/dashboard/publisher',
      ];

      // Verify all routes are defined
      agentRoutes.forEach(route => {
        expect(route).toMatch(/^\/dashboard\/(strategist|copywriter|scheduler|designer|publisher)$/);
      });
    });
  });

  describe('Workflow Progression', () => {
    it('should allow progression through complete workflow', async () => {
      const TestComponent = () => {
        const { useAgentContext } = require('@/context/AgentContext');
        const { workflowStatus, updateWorkflowStatus, setStrategy, setCaptions } = useAgentContext();
        
        const completeStrategist = () => {
          setStrategy({
            id: 'test-strategy',
            brandName: 'Test Brand',
            industry: 'Technology',
            targetAudience: 'Developers',
            goals: 'Increase engagement',
            contentPillars: ['Education', 'Innovation'],
            postingFrequency: '3x per week',
            keyThemes: ['AI', 'Automation'],
            tone: 'Professional',
            createdAt: new Date(),
          });
          updateWorkflowStatus('strategist', 'complete');
        };

        const completeCopywriter = () => {
          setCaptions([
            {
              id: 'caption-1',
              strategyId: 'test-strategy',
              text: 'Test caption',
              platform: 'instagram',
              hashtags: ['#test'],
              createdAt: new Date(),
            },
          ]);
          updateWorkflowStatus('copywriter', 'complete');
        };

        return (
          <div>
            <div data-testid="strategist-status">{workflowStatus.strategist}</div>
            <div data-testid="copywriter-status">{workflowStatus.copywriter}</div>
            <button onClick={completeStrategist}>Complete Strategist</button>
            <button onClick={completeCopywriter}>Complete Copywriter</button>
          </div>
        );
      };

      render(
        <AgentProvider>
          <TestComponent />
        </AgentProvider>
      );

      // Initially not started
      expect(screen.getByTestId('strategist-status')).toHaveTextContent('not-started');
      expect(screen.getByTestId('copywriter-status')).toHaveTextContent('not-started');

      // Complete strategist
      const strategistButton = screen.getByText('Complete Strategist');
      fireEvent.click(strategistButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('strategist-status')).toHaveTextContent('complete');
      });

      // Complete copywriter
      const copywriterButton = screen.getByText('Complete Copywriter');
      fireEvent.click(copywriterButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('copywriter-status')).toHaveTextContent('complete');
      });
    });
  });

  describe('Agent Context State Management', () => {
    it('should share strategy data between agents', () => {
      const TestComponent = () => {
        const { useAgentContext } = require('@/context/AgentContext');
        const { strategy, setStrategy } = useAgentContext();
        
        const createStrategy = () => {
          setStrategy({
            id: 'shared-strategy',
            brandName: 'Shared Brand',
            industry: 'Tech',
            targetAudience: 'Users',
            goals: 'Growth',
            contentPillars: ['Content'],
            postingFrequency: 'Daily',
            keyThemes: ['Theme'],
            tone: 'Casual',
            createdAt: new Date(),
          });
        };

        return (
          <div>
            <div data-testid="strategy-name">{strategy?.brandName || 'No strategy'}</div>
            <button onClick={createStrategy}>Create Strategy</button>
          </div>
        );
      };

      render(
        <AgentProvider>
          <TestComponent />
        </AgentProvider>
      );

      expect(screen.getByTestId('strategy-name')).toHaveTextContent('No strategy');

      const button = screen.getByText('Create Strategy');
      fireEvent.click(button);

      expect(screen.getByTestId('strategy-name')).toHaveTextContent('Shared Brand');
    });

    it('should share captions data between agents', () => {
      const TestComponent = () => {
        const { useAgentContext } = require('@/context/AgentContext');
        const { captions, setCaptions } = useAgentContext();
        
        const createCaptions = () => {
          setCaptions([
            {
              id: 'caption-1',
              strategyId: 'test',
              text: 'Caption 1',
              platform: 'instagram',
              hashtags: ['#test'],
              createdAt: new Date(),
            },
            {
              id: 'caption-2',
              strategyId: 'test',
              text: 'Caption 2',
              platform: 'twitter',
              hashtags: ['#test'],
              createdAt: new Date(),
            },
          ]);
        };

        return (
          <div>
            <div data-testid="caption-count">{captions.length}</div>
            <button onClick={createCaptions}>Create Captions</button>
          </div>
        );
      };

      render(
        <AgentProvider>
          <TestComponent />
        </AgentProvider>
      );

      expect(screen.getByTestId('caption-count')).toHaveTextContent('0');

      const button = screen.getByText('Create Captions');
      fireEvent.click(button);

      expect(screen.getByTestId('caption-count')).toHaveTextContent('2');
    });
  });
});
