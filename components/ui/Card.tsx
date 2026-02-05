import React from 'react';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'bordered' | 'elevated';
}

export const Card: React.FC<CardProps> = ({
  title,
  description,
  children,
  actions,
  className = '',
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-white rounded-lg p-6',
    bordered: 'bg-white border border-gray-200 rounded-lg p-6',
    elevated: 'bg-white rounded-lg p-6 shadow-lg',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      
      <div className="text-gray-700">
        {children}
      </div>

      {actions && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {actions}
        </div>
      )}
    </div>
  );
};
