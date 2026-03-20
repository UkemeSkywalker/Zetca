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
  /* No-Line Rule: no 1px solid borders for sectioning.
     Use tonal surface shifts instead. */
  const variantStyles = {
    default: 'bg-surface-container-lowest rounded-xl p-6',
    bordered: 'bg-surface-container-lowest rounded-xl p-6 ghost-border',
    elevated: 'bg-surface-container-lowest rounded-xl p-6 shadow-ambient',
  };

  return (
    <div className={`${variantStyles[variant]} ${className}`}>
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-headline-sm font-heading text-on-surface">{title}</h3>
          )}
          {description && (
            <p className="text-label-md text-outline mt-1">{description}</p>
          )}
        </div>
      )}
      
      <div className="text-on-surface/80">
        {children}
      </div>

      {actions && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--ghost-border)' }}>
          {actions}
        </div>
      )}
    </div>
  );
};
