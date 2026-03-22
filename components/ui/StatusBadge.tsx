import React from 'react';

type BadgeStatus = 'scheduled' | 'published' | 'draft' | 'complete' | 'in-progress' | 'not-started';

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  /* Design System: use secondary-container tones, no harsh borders */
  const colorMap: Record<BadgeStatus, string> = {
    'scheduled': 'bg-primary/10 text-primary',
    'published': 'bg-emerald-500/10 text-emerald-700',
    'draft': 'bg-surface-container-high text-outline',
    'complete': 'bg-emerald-500/10 text-emerald-700',
    'in-progress': 'bg-secondary/10 text-secondary',
    'not-started': 'bg-surface-container-high text-outline',
  };

  const labelMap: Record<BadgeStatus, string> = {
    'scheduled': 'Scheduled',
    'published': 'Published',
    'draft': 'Draft',
    'complete': 'Complete',
    'in-progress': 'In Progress',
    'not-started': 'Not Started',
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-medium ${colorMap[status]} ${className}`}
    >
      {labelMap[status]}
    </span>
  );
};
