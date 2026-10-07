'use client';

import Sidebar from '@/components/layout/Sidebar';
import { AgentProvider } from '@/context/AgentContext';
import LogoutButton from '@/components/auth/LogoutButton';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();

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

  return (
    <ErrorBoundary>
      <AgentProvider>
        <div className="min-h-screen bg-surface">
        <Sidebar />

        {/* Top Header Bar — light, same surface as the rest of the app */}
        <div className="md:ml-64 fixed top-0 right-0 left-0 md:left-64 h-16 md:h-20 bg-surface-container-lowest z-20 shadow-ambient-sm">
          <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="hidden sm:flex flex-1 max-w-xl">
              <div className="relative w-full">
                <label htmlFor="dashboard-search" className="sr-only">Search dashboard</label>
                <input
                  id="dashboard-search"
                  type="text"
                  placeholder="Search campaigns, generated drafts, schedules..."
                  className="w-full pl-10 pr-16 py-2.5 text-sm bg-surface-container-low text-on-surface placeholder:text-outline rounded-xl min-h-[44px] border-0 focus:outline-none transition-all"
                  style={{ border: 'none' }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.4)'; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  aria-label="Search dashboard"
                />
                <Icon
                  icon="solar:magnifer-linear"
                  width={18}
                  height={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline"
                  aria-hidden="true"
                />
                <kbd className="hidden md:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[11px] font-semibold text-outline bg-surface-container-lowest rounded" style={{ border: '1px solid var(--ghost-border)' }}>
                  ⌘ F
                </kbd>
              </div>
            </div>

            {/* Mobile: Logo/Title */}
            <div className="sm:hidden flex-1">
              <h1 className="text-lg font-bold font-heading text-on-surface ml-16">Dashboard</h1>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-1.5 md:gap-2">
              <button
                className="relative p-2 md:p-2.5 text-outline hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Messages"
              >
                <Icon icon="solar:letter-linear" width={20} height={20} aria-hidden="true" />
              </button>
              <button
                className="relative p-2 md:p-2.5 text-outline hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Notifications"
              >
                <Icon icon="solar:bell-linear" width={20} height={20} aria-hidden="true" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full ring-2 ring-surface-container-lowest" aria-label="New notifications"></span>
              </button>

              {/* LinkedIn Connected Badge */}
              {user?.linkedin?.isConnected && (
                <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-container-low">
                  <div className="relative">
                    <img
                      src={user.linkedin.pictureUrl || ''}
                      alt={`${user.linkedin.name || 'LinkedIn'} profile photo`}
                      width={28}
                      height={28}
                      className="w-7 h-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <svg
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 text-[#0A66C2] bg-surface-container-low rounded-full"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </div>
                  <span className="text-xs font-medium text-on-surface truncate max-w-[100px]">
                    {user.linkedin.name}
                  </span>
                </div>
              )}

              {/* User Menu Dropdown */}
              <div className="relative sm:ml-1">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2.5 py-1 pl-1 pr-2 hover:bg-surface-container-low rounded-xl transition-colors min-h-[44px]"
                  aria-label="User menu"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center gradient-primary shrink-0">
                    <span className="text-on-primary text-sm font-semibold">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <p className="text-sm font-semibold text-on-surface">{user?.name || 'User'}</p>
                    {user?.bio ? (
                      <p className="text-[11px] text-outline truncate max-w-[120px]">{user.bio}</p>
                    ) : (
                      <p className="text-[11px] text-outline">{user?.email}</p>
                    )}
                  </div>
                  <Icon icon="solar:alt-arrow-down-linear" width={16} height={16} className="hidden sm:block text-outline" aria-hidden="true" />
                </button>

                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsUserMenuOpen(false)}
                      aria-hidden="true"
                    />

                    <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-ambient py-2 z-40 glass" style={{ border: '1px solid var(--ghost-border)' }}>
                      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--ghost-border)' }}>
                        <p className="text-sm font-semibold text-on-surface">{user?.name || 'User'}</p>
                        <p className="text-label-sm text-outline truncate">{user?.email || ''}</p>
                      </div>

                      <div className="py-2">
                        <Link
                          href="/dashboard/profile"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-on-surface/80 hover:bg-surface-container-low transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <Icon icon="solar:user-linear" width={18} height={18} aria-hidden="true" />
                          <span>Profile</span>
                        </Link>
                      </div>

                      <div style={{ borderTop: '1px solid var(--ghost-border)' }} className="pt-2">
                        <LogoutButton onLogout={() => setIsUserMenuOpen(false)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <main className="md:ml-64 pt-16 md:pt-20 min-h-screen">
          <div className="p-4 sm:p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
      </AgentProvider>
    </ErrorBoundary>
  );
}
