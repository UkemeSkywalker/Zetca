import React from 'react';

type BadgeStatus = 'scheduled' | 'published' | 'draft' | 'complete' | 'in-progress' | 'not-started';

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const colorMap: Record<BadgeStatus, string> = {
    'scheduled': 'bg-yellow-100 text-yellow-800',
    'published': 'bg-green-100 text-green-800',
    'draft': 'bg-gray-100 text-gray-800',
    'complete': 'bg-green-100 text-green-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'not-started': 'bg-gray-100 text-gray-800',
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
