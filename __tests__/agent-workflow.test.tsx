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

    // Component renders both desktop and mobile versions, so we expect multiple instances
    const strategistElements = screen.getAllByText('Strategist');
    expect(strategistElements.length).toBeGreaterThan(0);
    
    const copywriterElements = screen.getAllByText('Copywriter');
    expect(copywriterElements.length).toBeGreaterThan(0);
    
    const schedulerElements = screen.getAllByText('Scheduler');
    expect(schedulerElements.length).toBeGreaterThan(0);
    
    const designerElements = screen.getAllByText('Designer');
    expect(designerElements.length).toBeGreaterThan(0);
    
    const publisherElements = screen.getAllByText('Publisher');
    expect(publisherElements.length).toBeGreaterThan(0);
  });

  it('should highlight the current agent based on route', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    const { container } = render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    // Find the strategist steps and check if at least one has the active styling
    const strategistElements = screen.getAllByText('Strategist');
    const hasActiveStrategist = strategistElements.some(element => 
      element.classList.contains('text-blue-600')
    );
    expect(hasActiveStrategist).toBe(true);
  });

  it('should display status badges for each agent', () => {
    mockUsePathname.mockReturnValue('/dashboard/strategist');

    render(
      <AgentProvider>
        <AgentWorkflow />
      </AgentProvider>
    );

    // All agents should start with "Not Started" status
    // Component renders both desktop and mobile versions, so we expect 10 badges (5 agents x 2 layouts)
    const notStartedBadges = screen.getAllByText('Not Started');
    expect(notStartedBadges).toHaveLength(10);
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

    // Component renders both desktop and mobile versions, so we expect multiple instances of each icon
    expect(screen.getAllByTestId('icon-solar:lightbulb-bolt-bold').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-solar:pen-bold').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-solar:calendar-bold').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-solar:palette-bold').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('icon-solar:send-square-bold').length).toBeGreaterThan(0);
  });
});
