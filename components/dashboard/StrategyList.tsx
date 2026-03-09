'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { listStrategies, StrategyAPIError } from '@/lib/api/strategyClient';
import { StrategyRecord } from '@/types/strategy';
import { Icon } from '@iconify/react';

interface StrategyListProps {
  onStrategyClick: (strategy: StrategyRecord) => void;
}

export const StrategyList: React.FC<StrategyListProps> = ({ onStrategyClick }) => {
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await listStrategies();
      setStrategies(data);
    } catch (err) {
      if (err instanceof StrategyAPIError) {
        setError(err.message);
      } else {
        setError('Failed to load strategies. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="bordered" className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </Card>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card variant="bordered" className="text-center">
        <div className="flex flex-col items-center gap-4 py-8">
          <Icon icon="solar:danger-circle-bold" className="text-red-500" width={48} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Strategies</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={loadStrategies} variant="outline" size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Empty state
  if (strategies.length === 0) {
    return (
      <Card variant="bordered" className="text-center">
        <div className="flex flex-col items-center gap-4 py-12">
          <Icon icon="solar:document-text-bold" className="text-gray-400" width={64} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Strategies Yet</h3>
            <p className="text-gray-600">
              Generate your first social media strategy to get started.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Strategy list
  return (
    <div className="space-y-4">
      {strategies.map((strategy) => (
        <div
          key={strategy.id}
          onClick={() => onStrategyClick(strategy)}
          className="cursor-pointer"
        >
          <Card
            variant="bordered"
            className="hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {strategy.brandName}
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:case-round-bold" width={16} />
                    <span>{strategy.industry}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:calendar-bold" width={16} />
                    <span>{formatDate(strategy.createdAt)}</span>
                  </div>
                </div>
              </div>
              <Icon 
                icon="solar:alt-arrow-right-bold" 
                className="text-gray-400 mt-1" 
                width={20} 
              />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};
