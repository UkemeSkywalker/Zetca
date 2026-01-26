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

describe('PageWrapper Component', () => {
  const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard/strategist');
  });

  it('should render children', () => {
    render(
      <AgentProvider>
        <PageWrapper>
          <div>Test Content</div>
        </PageWrapper>
      </AgentProvider>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should render title when provided', () => {
    render(
      <AgentProvider>
        <PageWrapper title="Test Title">
          <div>Content</div>
        </PageWrapper>
      </AgentProvider>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <AgentProvider>
        <PageWrapper title="Test Title" description="Test Description">
          <div>Content</div>
        </PageWrapper>
      </AgentProvider>
    );

    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should show workflow when showWorkflow is true', () => {
    render(
      <AgentProvider>
        <PageWrapper showWorkflow={true}>
          <div>Content</div>
        </PageWrapper>
      </AgentProvider>
    );

    expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
  });

  it('should not show workflow when showWorkflow is false', () => {
    render(
      <AgentProvider>
        <PageWrapper showWorkflow={false}>
          <div>Content</div>
        </PageWrapper>
      </AgentProvider>
    );

    expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();
  });

  it('should not show workflow by default', () => {
    render(
      <AgentProvider>
        <PageWrapper>
          <div>Content</div>
        </PageWrapper>
      </AgentProvider>
    );

    expect(screen.queryByText('Agent Workflow')).not.toBeInTheDocument();
  });
});
