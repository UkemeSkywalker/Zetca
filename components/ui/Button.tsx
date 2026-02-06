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
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'text-white focus:ring-[#3139FB]',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    outline: 'border-2 text-white focus:ring-[#3139FB]',
    ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };

  const sizeStyles: Record<ButtonSize, string> = {
    sm: 'py-2.5 px-4 text-sm gap-1.5 min-h-[44px]', // Touch-friendly minimum
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
          ? { background: 'linear-gradient(45deg, var(--colors--linear-color-01), var(--colors--linear-color-02))' }
          : variant === 'outline'
          ? { borderColor: '#3139FB', color: '#3139FB', backgroundColor: 'transparent' }
          : undefined
      }
      onMouseEnter={(e) => {
        if (variant === 'outline' && !disabled && !isLoading) {
          e.currentTarget.style.backgroundColor = '#EEF0FF';
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
