'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer, 
  size = 'md' 
}: ModalProps) {
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  /* Glass & Gradient Rule: 80% opacity + 20px backdrop-blur */
  const modalContent = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-on-surface/30 transition-opacity z-40"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Modal Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none">
        <div 
          className={`relative rounded-xl shadow-ambient-lg w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col pointer-events-auto`}
          style={{
            background: 'rgba(246, 246, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header - no border, tonal shift */}
          <div className="flex items-center justify-between p-4 sm:p-6 bg-surface-container-low/50 rounded-t-xl flex-shrink-0">
            <h2 
              id="modal-title"
              className="text-headline-sm font-heading text-on-surface pr-4"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-outline hover:text-on-surface transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 rounded hover:bg-surface-container-high/50"
              aria-label="Close modal"
            >
              <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto overflow-x-visible flex-1">
            {children}
          </div>

          {/* Footer - tonal shift instead of border */}
          {footer && (
            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 bg-surface-container-low/50 rounded-b-xl flex-shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
