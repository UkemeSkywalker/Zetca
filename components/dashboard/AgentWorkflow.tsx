'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAgentContext } from '@/context/AgentContext';

interface WorkflowStep {
  id: string;
  label: string;
  route: string;
  icon: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 'strategist',
    label: 'Strategist',
    route: '/dashboard/strategist',
    icon: 'solar:lightbulb-bolt-bold',
  },
  {
    id: 'copywriter',
    label: 'Copywriter',
    route: '/dashboard/copywriter',
    icon: 'solar:pen-bold',
  },
  {
    id: 'scheduler',
    label: 'Scheduler',
    route: '/dashboard/scheduler',
    icon: 'solar:calendar-bold',
  },
  {
    id: 'designer',
    label: 'Designer',
    route: '/dashboard/designer',
    icon: 'solar:palette-bold',
  },
  {
    id: 'publisher',
    label: 'Publisher',
    route: '/dashboard/publisher',
    icon: 'solar:send-square-bold',
  },
];

interface AgentWorkflowProps {
  className?: string;
}

export const AgentWorkflow: React.FC<AgentWorkflowProps> = ({ className = '' }) => {
  const pathname = usePathname();
  const { workflowStatus } = useAgentContext();

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Agent Workflow</h2>
      
      {/* Desktop: Horizontal Layout */}
      <div className="hidden md:flex items-center justify-between">
        {workflowSteps.map((step, index) => {
          const isActive = pathname === step.route;
          const status = workflowStatus[step.id as keyof typeof workflowStatus];
          
          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center gap-2 flex-1">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon icon={step.icon} className="w-8 h-8" />
                </div>
                <span
                  className={`text-sm font-medium ${
                    isActive ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {step.label}
                </span>
                <StatusBadge status={status} />
              </div>
              
              {/* Arrow */}
              {index < workflowSteps.length - 1 && (
                <div className="flex-shrink-0 px-4">
                  <Icon
                    icon="solar:arrow-right-bold"
                    className="w-6 h-6 text-gray-400"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Mobile: Vertical Layout */}
      <div className="md:hidden space-y-4">
        {workflowSteps.map((step, index) => {
          const isActive = pathname === step.route;
          const status = workflowStatus[step.id as keyof typeof workflowStatus];
          
          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon icon={step.icon} className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <span
                    className={`text-sm font-medium block ${
                      isActive ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {step.label}
                  </span>
                  <div className="mt-1">
                    <StatusBadge status={status} />
                  </div>
                </div>
              </div>
              
              {/* Arrow */}
              {index < workflowSteps.length - 1 && (
                <div className="flex justify-center">
                  <Icon
                    icon="solar:arrow-down-bold"
                    className="w-6 h-6 text-gray-400"
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
