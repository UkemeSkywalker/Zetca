'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    // Log error to console
    console.error('Dashboard error:', error);
  }, [error]);

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 py-8">
      <Card className="max-w-lg w-full" variant="bordered">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Dashboard Error
          </h2>
          <p className="text-gray-600 mb-6">
            Something went wrong while loading this page. You can try again or return to the dashboard home.
          </p>
          {error.message && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-red-800 mb-1">Error details:</p>
              <p className="text-sm text-red-700 font-mono break-words">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleGoHome} variant="primary" size="md">
              Go to Dashboard Home
            </Button>
            <Button onClick={reset} variant="outline" size="md">
              Try Again
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
