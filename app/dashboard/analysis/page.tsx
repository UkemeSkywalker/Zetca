'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { AnalyticsCards } from '@/components/dashboard/AnalyticsCards';
import { EngagementChart } from '@/components/dashboard/EngagementChart';
import { PlatformPerformance } from '@/components/dashboard/PlatformPerformance';
import { TopPostsList } from '@/components/dashboard/TopPostsList';
import mockAnalytics from '@/data/mockAnalytics.json';

export default function AnalysisPage() {
  // Type assertion for platform performance data
  const platformPerformance = mockAnalytics.platformPerformance as Array<{
    platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
    posts: number;
    engagement: number;
    reach: number;
  }>;

  return (
    <PageWrapper 
      title="Analytics Dashboard" 
      showWorkflow={false}
      className="px-4 md:px-6 lg:px-8 py-6"
    >
      {/* Metrics Cards */}
      <AnalyticsCards metrics={mockAnalytics.metrics} />

      {/* Engagement Chart */}
      <EngagementChart data={mockAnalytics.engagementData} />

      {/* Platform Performance */}
      <PlatformPerformance data={platformPerformance} />

      {/* Top Posts */}
      <TopPostsList posts={mockAnalytics.topPosts} />
    </PageWrapper>
  );
}
