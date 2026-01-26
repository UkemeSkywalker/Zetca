'use client';

import React from 'react';
import { AgentWorkflow } from '@/components/dashboard/AgentWorkflow';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showWorkflow?: boolean;
  className?: string;
}

export const PageWrapper: React.FC<PageWrapperProps> = ({
  children,
  title,
  description,
  showWorkflow = false,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      {/* Agent Workflow - Only shown on agent tool pages */}
      {showWorkflow && <AgentWorkflow />}
      
      {/* Page Header */}
      {(title || description) && (
        <div className="mb-6">
          {title && (
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          )}
          {description && (
            <p className="text-gray-600">{description}</p>
          )}
        </div>
      )}
      
      {/* Page Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};
