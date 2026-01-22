// types/agent.ts
export interface Strategy {
  id: string;
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
  contentPillars: string[];
  postingFrequency: string;
  keyThemes: string[];
  tone: string;
  createdAt: Date;
}

export interface Caption {
  id: string;
  strategyId: string;
  text: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  hashtags: string[];
  createdAt: Date;
}

export interface WorkflowStatus {
  strategist: 'complete' | 'in-progress' | 'not-started';
  copywriter: 'complete' | 'in-progress' | 'not-started';
  scheduler: 'complete' | 'in-progress' | 'not-started';
  designer: 'complete' | 'in-progress' | 'not-started';
  publisher: 'complete' | 'in-progress' | 'not-started';
}
