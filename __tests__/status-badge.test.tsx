import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

type Status = React.ComponentProps<typeof StatusBadge>['status'];

describe('StatusBadge Component', () => {
  const labels: Array<[Status, string]> = [
    ['scheduled', 'Scheduled'],
    ['published', 'Published'],
    ['draft', 'Draft'],
    ['publishing', 'Publishing…'],
    ['failed', 'Failed'],
    ['complete', 'Complete'],
    ['in-progress', 'In Progress'],
    ['not-started', 'Not Started'],
  ];

  it.each(labels)('labels the %s status as "%s"', (status, label) => {
    render(<StatusBadge status={status} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('shows only the label for its own status', () => {
    render(<StatusBadge status="failed" />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.queryByText('Scheduled')).not.toBeInTheDocument();
    expect(screen.queryByText('Published')).not.toBeInTheDocument();
  });

  it('updates its label when the status changes', () => {
    const { rerender } = render(<StatusBadge status="scheduled" />);
    expect(screen.getByText('Scheduled')).toBeInTheDocument();

    rerender(<StatusBadge status="publishing" />);
    expect(screen.getByText('Publishing…')).toBeInTheDocument();

    rerender(<StatusBadge status="published" />);
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.queryByText('Publishing…')).not.toBeInTheDocument();
  });

  it('gives each outcome a distinct style from a post still waiting', () => {
    const { rerender } = render(<StatusBadge status="scheduled" />);
    const scheduled = screen.getByText('Scheduled').className;

    rerender(<StatusBadge status="failed" />);
    const failed = screen.getByText('Failed').className;

    rerender(<StatusBadge status="published" />);
    const published = screen.getByText('Published').className;

    expect(new Set([scheduled, failed, published]).size).toBe(3);
  });

  it('passes through a custom className', () => {
    render(<StatusBadge status="scheduled" className="custom-class" />);

    expect(screen.getByText('Scheduled')).toHaveClass('custom-class');
  });
});
