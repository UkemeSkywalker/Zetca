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

export interface CopyRecord {
  id: string;
  strategyId: string;
  userId: string;
  text: string;
  platform: string;
  hashtags: string[];
  /** Short name of the copy's angle, e.g. "Bold hook" */
  angle?: string;
  /** The background generation job that wrote this copy, if any */
  jobId?: string;
  createdAt: string;
  updatedAt: string;
}

/** A full set being written in the background */
export interface CopyJob {
  id: string;
  status: 'running' | 'done' | 'failed';
  total: number;
  /** Copies saved so far, per platform */
  completed: Record<string, number>;
  failedPlatforms: string[];
  error?: string;
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
}

export interface CopyChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  copyId?: string;
  action?: 'reply' | 'create' | 'update' | 'generate_all' | 'job_done' | 'job_failed';
  createdAt: string;
}

export interface CopyWorkspace {
  copies: CopyRecord[];
  job: CopyJob | null;
  chat: CopyChatMessage[];
}

export interface CopyChatResult {
  messages: CopyChatMessage[];
  copy?: CopyRecord;
  job?: CopyJob;
}

export interface ChatResponse {
  updatedText: string;
  updatedHashtags: string[];
  aiMessage: string;
}

export interface WorkflowStatus {
  strategist: 'complete' | 'in-progress' | 'not-started';
  copywriter: 'complete' | 'in-progress' | 'not-started';
  scheduler: 'complete' | 'in-progress' | 'not-started';
  designer: 'complete' | 'in-progress' | 'not-started';
  publisher: 'complete' | 'in-progress' | 'not-started';
}
