'use client';

import React from 'react';

type SkeletonVariant = 'rectangle' | 'circle' | 'text' | 'image';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  count?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'rectangle',
  width,
  height,
  className = '',
  count = 1,
}) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'circle':
        return 'rounded-full';
      case 'text':
        return 'rounded h-4';
      case 'image':
        return 'rounded-lg aspect-square';
      case 'rectangle':
      default:
        return 'rounded';
    }
  };

  const getDefaultSize = () => {
    switch (variant) {
      case 'circle':
        return { width: '40px', height: '40px' };
      case 'text':
        return { width: '100%', height: '16px' };
      case 'image':
        return { width: '100%', height: 'auto' };
      case 'rectangle':
      default:
        return { width: '100%', height: '20px' };
    }
  };

  const defaultSize = getDefaultSize();
  const style = {
    width: width || defaultSize.width,
    height: height || defaultSize.height,
  };

  const skeletonElement = (
    <div
      className={`
        bg-gray-200 
        animate-pulse 
        ${getVariantClasses()} 
        ${className}
      `}
      style={style}
      aria-label="Loading..."
      role="status"
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>
          {skeletonElement}
        </div>
      ))}
    </div>
  );
};