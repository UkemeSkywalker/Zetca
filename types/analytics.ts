// types/analytics.ts
export interface Metric {
  label: string;
  value: string | number;
  change: number;
  icon: string;
}

export interface EngagementData {
  date: string;
  engagement: number;
  reach: number;
  clicks: number;
}

export interface PlatformPerformance {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  posts: number;
  engagement: number;
  reach: number;
}

export interface TopPost {
  id: string;
  content: string;
  platform: string;
  engagement: number;
  reach: number;
  publishedAt: Date;
}

export interface Analytics {
  metrics: Metric[];
  engagementData: EngagementData[];
  platformPerformance: PlatformPerformance[];
  topPosts: TopPost[];
}
