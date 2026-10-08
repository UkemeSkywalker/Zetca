'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Icon } from '@iconify/react';
import { useAuth } from '@/context/AuthContext';
import LogoutButton from '@/components/auth/LogoutButton';

interface DashboardHeaderProps {
  /** Positioning and sizing for the outer bar, e.g. fixed beside the sidebar or sticky full width */
  className?: string;
  /** Shown on the left before the search bar (the quiz uses this for the logo and step progress) */
  leading?: React.ReactNode;
  /** Shown on the right, before the icons (the quiz uses this for its exit button) */
  trailing?: React.ReactNode;
  /** Title shown instead of the search bar on small screens */
  mobileTitle?: string;
  /** Rendered under the bar, inside the header (the quiz uses this for its progress line) */
  children?: React.ReactNode;
}

/** The dashboard's top header: search, messages, notifications and the user menu */
export function DashboardHeader({ className = '', leading, trailing, mobileTitle = 'Dashboard', children }: DashboardHeaderProps) {
  const { user } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className={`bg-white z-20 border-b border-slate-200/70 ${className}`}>
      <div className="h-16 md:h-[78px] px-4 md:pl-[30px] md:pr-[30px] flex items-center justify-between gap-4">
        {leading}

        {/* Search Bar */}
        <div className="hidden sm:flex flex-1 max-w-[541px]">
          <div className="relative w-full">
            <label htmlFor="dashboard-search" className="sr-only">Search dashboard</label>
            <input
              id="dashboard-search"
              type="text"
              placeholder="Search campaigns, generated drafts, schedules..."
              className="w-full pl-[38px] pr-14 h-10 text-[13px] bg-slate-50 text-on-surface placeholder:text-slate-400 rounded-[10px] border border-slate-200/80 focus:outline-none transition-all"
              onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(79, 70, 229, 0.4)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              aria-label="Search dashboard"
            />
            <Icon
              icon="solar:magnifer-linear"
              width={16}
              height={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <kbd className="hidden md:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 bg-white rounded border border-slate-200 font-heading">
              ⌘F
            </kbd>
          </div>
        </div>

        {/* Mobile: Logo/Title */}
        {!leading && (
          <div className="sm:hidden flex-1">
            <h1 className="text-lg font-bold font-heading text-on-surface ml-16">{mobileTitle}</h1>
          </div>
        )}

        {/* Right Side Icons */}
        <div className="flex items-center gap-1.5 md:gap-3">
          {trailing}
          <button
            className="relative p-2 md:p-2.5 text-outline hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Messages"
          >
            <Icon icon="lucide:mail" width={18} height={18} className="text-slate-600" aria-hidden="true" />
          </button>
          <button
            className="relative p-2 md:p-2.5 text-outline hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Notifications"
          >
            <Icon icon="lucide:bell" width={18} height={18} className="text-slate-600" aria-hidden="true" />
            <span className="absolute top-2.5 right-2.5 w-[7px] h-[7px] bg-rose-500 rounded-full" aria-label="New notifications"></span>
          </button>

          {/* LinkedIn Connected Badge */}
          {user?.linkedin?.isConnected && (
            <div className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg bg-surface-container-low">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
          <div className="relative sm:ml-3 sm:pl-4 sm:border-l sm:border-slate-200/70">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 py-1 pl-1 pr-2 hover:bg-surface-container-low rounded-xl transition-colors min-h-[44px]"
              aria-label="User menu"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center bg-indigo-600 shrink-0">
                <span className="text-white text-[13px] font-semibold">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-[13px] font-semibold text-slate-900">{user?.name || 'User'}</p>
                {user?.bio ? (
                  <p className="text-[10.5px] text-slate-400 truncate max-w-[120px]">{user.bio}</p>
                ) : (
                  <p className="text-[10.5px] text-slate-400">{user?.email}</p>
                )}
              </div>
              <Icon icon="lucide:chevron-down" width={15} height={15} className="hidden sm:block ml-2 text-slate-400" aria-hidden="true" />
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
      {children}
    </div>
  );
}
