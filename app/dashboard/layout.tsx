'use client';

import Sidebar from '@/components/layout/Sidebar';
import { AgentProvider } from '@/context/AgentContext';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 mb-4" style={{ borderBottom: '2px solid var(--primary)' }}></div>
          <p className="text-outline">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // The strategy quiz is a full-screen wizard without the sidebar
  if (pathname === '/dashboard/strategist') {
    return (
      <ErrorBoundary>
        <AgentProvider>{children}</AgentProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AgentProvider>
        <div className="min-h-screen bg-surface font-heading">
        <Sidebar />

        <DashboardHeader className="fixed top-0 right-0 left-0 md:left-[248px]" />

        {/* Main content area */}
        <main className="md:ml-[248px] pt-16 md:pt-[78px] min-h-screen">
          <div className="p-4 sm:p-6 md:px-[30px] md:pt-[30px] md:pb-[30px]">
            {children}
          </div>
        </main>
      </div>
      </AgentProvider>
    </ErrorBoundary>
  );
}
