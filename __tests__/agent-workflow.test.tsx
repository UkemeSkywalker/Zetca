import React from 'react';
import { render, screen } from '@testing-library/react';
import { AgentWorkflow } from '@/components/dashboard/AgentWorkflow';
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

describe('AgentWorkflow Component', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render all workflow steps', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    expect(screen.getByText('Strategist')).toBeInTheDocument();
    expect(screen.getByText('Copywriter')).toBeInTheDocument();
    expect(screen.getByText('Scheduler')).toBeInTheDocument();
    expect(screen.getByText('Designer')).toBeInTheDocument();
    expect(screen.getByText('Publisher')).toBeInTheDocument();
  });

  it('should highlight the current agent based on route', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    const { container } = render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    // Find the strategist step and check if it has the active styling
    const strategistText = screen.getByText('Strategist');
    expect(strategistText).toHaveClass('text-blue-600');
  });

  it('should display status badges for each agent', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    // All agents should start with "Not Started" status
    const notStartedBadges = screen.getAllByText('Not Started');
    expect(notStartedBadges).toHaveLength(5);
  });

  it('should render workflow title', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
  });

  it('should render icons for each agent', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    const { container } = render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    expect(screen.getByTestId('icon-solar:lightbulb-bolt-bold')).toBeInTheDocument();
    expect(screen.getByTestId('icon-solar:pen-bold')).toBeInTheDocument();
    expect(screen.getByTestId('icon-solar:calendar-bold')).toBeInTheDocument();
    expect(screen.getByTestId('icon-solar:palette-bold')).toBeInTheDocument();
    expect(screen.getByTestId('icon-solar:send-square-bold')).toBeInTheDocument();
  });
});
