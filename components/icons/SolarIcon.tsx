'use client';

import { Icon } from '@iconify/react';

interface SolarIconProps {
  icon: string;
  size?: number;
  color?: string;
  className?: string;
}

export default function SolarIcon({ 
  icon, 
  size = 24, 
  color, 
  className 
}: SolarIconProps) {
  return (
    <Icon 
      icon={icon} 
      width={size} 
      height={size} 
      style={{ color }} 
      className={className}
    />
  );
}
