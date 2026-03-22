'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@/components/ui/Card';

interface Metric {
  label: string;
  value: string;
  change: number;
  icon: string;
}

interface AnalyticsCardsProps {
  metrics: Metric[];
  className?: string;
}

export const AnalyticsCards: React.FC<AnalyticsCardsProps> = ({
  metrics,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {metrics.map((metric, index) => (
        <Card key={index} variant="elevated" className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-label-md font-medium text-outline mb-1">
                {metric.label}
              </p>
              <p className="text-3xl font-bold font-heading text-on-surface mb-2">
                {metric.value}
              </p>
              <div className="flex items-center">
                <Icon
                  icon={metric.change >= 0 ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
                  className={`w-4 h-4 mr-1 ${
                    metric.change >= 0 ? 'text-emerald-600' : 'text-error'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    metric.change >= 0 ? 'text-emerald-600' : 'text-error'
                  }`}
                >
                  {Math.abs(metric.change)}%
                </span>
              </div>
            </div>
            <div className="ml-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon icon={metric.icon} className="w-6 h-6 text-primary" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
