'use client';

import React from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { useRouter } from 'next/navigation';

interface AuthErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

/**
 * Custom fallback UI for authentication errors
 */
function AuthErrorFallback({ error, resetError }: AuthErrorFallbackProps) {
  const router = useRouter();

  const handleRetry = () => {
    resetError();
    router.refresh();
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 rounded-full mb-4">
          <svg
            className="w-6 h-6 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Authentication Error
        </h2>
        <p className="text-gray-600 text-center mb-6">
          There was a problem with your authentication. Please try logging in again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-gray-100 rounded-md">
            <p className="text-sm font-mono text-red-600 break-all">
              {error.message}
            </p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleGoToLogin}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

interface AuthErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Error boundary specifically for authentication-related errors
 */
export function AuthErrorBoundary({ children }: AuthErrorBoundaryProps) {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = (error: Error) => {
    setError(error);
  };

  const resetError = () => {
    setError(null);
  };

  if (error) {
    return <AuthErrorFallback error={error} resetError={resetError} />;
  }

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={error ? <AuthErrorFallback error={error} resetError={resetError} /> : undefined}
    >
      {children}
    </ErrorBoundary>
  );
}
