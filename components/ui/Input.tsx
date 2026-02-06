'use client';

import React, { useId } from 'react';
import { Icon } from '@iconify/react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: string;
  rightIcon?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const baseStyles = 'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:outline-none transition-colors min-h-[44px]';
    const normalStyles = 'border-gray-300 focus:ring-blue-500 focus:border-transparent';
    const errorStyles = 'border-red-500 focus:ring-red-500';
    const iconPaddingLeft = leftIcon ? 'pl-11' : '';
    const iconPaddingRight = rightIcon ? 'pr-11' : '';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon icon={leftIcon} width={20} />
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${error ? errorStyles : normalStyles} ${iconPaddingLeft} ${iconPaddingRight} ${className}`}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon icon={rightIcon} width={20} />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-1">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
