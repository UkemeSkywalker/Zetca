'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Strategy, Caption, WorkflowStatus } from '@/types/agent';

interface AgentContextType {
  strategy: Strategy | null;
  captions: Caption[];
  workflowStatus: WorkflowStatus;
  setStrategy: (strategy: Strategy | null) => void;
  setCaptions: (captions: Caption[]) => void;
  updateWorkflowStatus: (agent: keyof WorkflowStatus, status: WorkflowStatus[keyof WorkflowStatus]) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    strategist: 'not-started',
    copywriter: 'not-started',
    scheduler: 'not-started',
    designer: 'not-started',
    publisher: 'not-started',
  });

  const updateWorkflowStatus = (
    agent: keyof WorkflowStatus,
    status: WorkflowStatus[keyof WorkflowStatus]
  ) => {
    setWorkflowStatus((prev) => ({
      ...prev,
      [agent]: status,
    }));
  };

  return (
    <AgentContext.Provider
      value={{
        strategy,
        captions,
        workflowStatus,
        setStrategy,
        setCaptions,
        updateWorkflowStatus,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgentContext must be used within an AgentProvider');
  }
  return context;
};
