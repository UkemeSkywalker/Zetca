'use client';

import React from 'react';
import { Icon } from '@iconify/react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'text-on-primary focus:ring-primary/50 shadow-ambient-sm hover:shadow-ambient',
    secondary: 'bg-surface-container-high text-primary hover:bg-surface-container-highest focus:ring-primary/30',
    outline: 'bg-transparent text-primary focus:ring-primary/30',
    ghost: 'bg-transparent text-primary hover:bg-surface-container-low focus:ring-primary/30',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'py-2.5 px-4 text-sm gap-1.5 min-h-[44px]',
    md: 'py-3 px-5 text-base gap-2 min-h-[44px]',
    lg: 'py-4 px-6 text-lg gap-2.5 min-h-[48px]',
  };

  const iconSizes: Record<ButtonSize, number> = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      style={
        variant === 'primary'
          ? { background: 'var(--gradient-primary)' }
          : variant === 'outline'
          ? { border: '2px solid var(--primary)', color: 'var(--primary)' }
          : undefined
      }
      onMouseEnter={(e) => {
        if (variant === 'outline' && !disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = 'var(--surface-container-low)';
        }
      }}
      onMouseLeave={(e) => {
        if (variant === 'outline' && !disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Icon icon="solar:spinner-bold" className="animate-spin" width={iconSizes[size]} />
      ) : (
        <>
          {leftIcon && <Icon icon={leftIcon} width={iconSizes[size]} />}
          {children}
          {rightIcon && <Icon icon={rightIcon} width={iconSizes[size]} />}
        </>
      )}
    </button>
  );
};

export default Button;
