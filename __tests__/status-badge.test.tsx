import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge Component', () => {
  it('should render scheduled status with yellow styling', () => {
    const { container } = render(<StatusBadge status="scheduled" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('should render published status with green styling', () => {
    const { container } = render(<StatusBadge status="published" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should render draft status with gray styling', () => {
    const { container } = render(<StatusBadge status="draft" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should render complete status with green styling', () => {
    const { container } = render(<StatusBadge status="complete" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Complete')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('should render in-progress status with blue styling', () => {
    const { container } = render(<StatusBadge status="in-progress" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('should render not-started status with gray styling', () => {
    const { container } = render(<StatusBadge status="not-started" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(screen.getByText('Not Started')).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('should apply rounded-full styling', () => {
    const { container } = render(<StatusBadge status="scheduled" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(badge).toHaveClass('rounded-full');
  });

  it('should apply custom className', () => {
    const { container } = render(<StatusBadge status="scheduled" className="custom-class" />);
    const badge = container.firstChild as HTMLElement;
    
    expect(badge).toHaveClass('custom-class');
  });
});
