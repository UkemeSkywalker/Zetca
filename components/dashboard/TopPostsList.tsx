'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@/components/ui/Card';

interface TopPost {
  id: string;
  content: string;
  platform: string;
  engagement: number;
  reach: number;
  publishedAt: string;
}

interface TopPostsListProps {
  posts: TopPost[];
  className?: string;
}

const platformConfig: Record<string, { icon: string; color: string }> = {
  instagram: { icon: 'skill-icons:instagram', color: 'text-pink-600' },
  twitter: { icon: 'skill-icons:twitter', color: 'text-blue-500' },
  linkedin: { icon: 'skill-icons:linkedin', color: 'text-blue-700' },
  facebook: { icon: 'logos:facebook', color: 'text-blue-600' },
};

export const TopPostsList: React.FC<TopPostsListProps> = ({
  posts,
  className = '',
}) => {
  return (
    <Card className={className}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Performing Posts
        </h3>
        <div className="space-y-4">
          {posts.map((post, index) => {
            const config = platformConfig[post.platform] || { 
              icon: 'solar:document-bold', 
              color: 'text-gray-600' 
            };
            const date = new Date(post.publishedAt);
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            return (
              <div
                key={post.id}
                className="flex items-start space-x-4 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
              >
                {/* Rank Badge */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-600">
                    {index + 1}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 mb-2 line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Icon icon={config.icon} className="w-4 h-4 mr-1" />
                      <span className="capitalize">{post.platform}</span>
                    </div>
                    <div className="flex items-center">
                      <Icon icon="solar:calendar-bold" className="w-4 h-4 mr-1" />
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex-shrink-0 text-right">
                  <div className="flex items-center text-sm font-semibold text-gray-900 mb-1">
                    <Icon icon="solar:heart-bold" className="w-4 h-4 mr-1 text-red-500" />
                    {post.engagement.toLocaleString()}
                  </div>
                  <div className="flex items-center text-xs text-gray-500">
                    <Icon icon="solar:eye-bold" className="w-4 h-4 mr-1" />
                    {post.reach.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};
