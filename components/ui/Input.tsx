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
    /* Design System: surface-container-low bg, 0px border, focus = 2px ghost border primary 40% */
    const baseStyles = 'w-full px-4 py-3 rounded focus:outline-none transition-all min-h-[44px]';
    const normalStyles = 'bg-surface-container-low border-0 focus:ring-0';
    const errorStyles = 'bg-on-error border-0 focus:ring-0';
    const iconPaddingLeft = leftIcon ? 'pl-11' : '';
    const iconPaddingRight = rightIcon ? 'pr-11' : '';

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-label-md font-medium text-on-surface mb-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-outline">
              <Icon icon={leftIcon} width={20} />
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`${baseStyles} ${error ? errorStyles : normalStyles} ${iconPaddingLeft} ${iconPaddingRight} ${className}`}
            style={{
              border: error ? '2px solid var(--error)' : 'none',
            }}
            onFocus={(e) => {
              if (!error) {
                e.currentTarget.style.border = '2px solid var(--ghost-border-focus)';
                e.currentTarget.style.borderColor = 'rgba(74, 64, 224, 0.4)';
              }
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) {
                e.currentTarget.style.border = 'none';
              }
              props.onBlur?.(e);
            }}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-outline">
              <Icon icon={rightIcon} width={20} />
            </div>
          )}
        </div>

        {error && (
          <p className="text-sm text-error mt-1">{error}</p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-outline mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
