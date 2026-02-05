'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@/components/ui/Card';

interface PlatformData {
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  posts: number;
  engagement: number;
  reach: number;
}

interface PlatformPerformanceProps {
  data: PlatformData[];
  className?: string;
}

const platformConfig = {
  instagram: {
    name: 'Instagram',
    icon: 'solar:instagram-bold',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  twitter: {
    name: 'Twitter',
    icon: 'solar:twitter-bold',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: 'solar:linkedin-bold',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
  },
  facebook: {
    name: 'Facebook',
    icon: 'solar:facebook-bold',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
};

export const PlatformPerformance: React.FC<PlatformPerformanceProps> = ({
  data,
  className = '',
}) => {
  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Platform Performance
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.map((platform) => {
          const config = platformConfig[platform.platform];
          
          return (
            <Card key={platform.platform} variant="bordered" className="p-4">
              <div className="flex items-center mb-4">
                <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center mr-3`}>
                  <Icon icon={config.icon} className={`w-5 h-5 ${config.color}`} />
                </div>
                <h4 className="font-semibold text-gray-900">{config.name}</h4>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Posts</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {platform.posts}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Engagement</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {platform.engagement.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Reach</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {platform.reach.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
