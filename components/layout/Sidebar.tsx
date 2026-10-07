'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Strategist', href: '/dashboard/strategist', icon: 'solar:lightbulb-bolt-bold' },
  { label: 'Copywriter', href: '/dashboard/copywriter', icon: 'solar:pen-bold' },
  { label: 'Scheduler', href: '/dashboard/scheduler', icon: 'solar:calendar-bold' },
  { label: 'Designer', href: '/dashboard/designer', icon: 'solar:palette-bold' },
  { label: 'Publisher', href: '/dashboard/publisher', icon: 'solar:send-square-bold' },
  { label: 'Analysis', href: '/dashboard/analysis', icon: 'solar:chart-bold' },
  { label: 'Profile', href: '/dashboard/profile', icon: 'solar:user-bold' },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-dash-card text-dash-text rounded-lg shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <Icon icon={isMobileMenuOpen ? 'solar:close-square-bold' : 'solar:hamburger-menu-bold'} width={24} height={24} />
      </button>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          style={{ backdropFilter: 'blur(4px)' }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-dash-sidebar z-40
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${className}
        `}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center gradient-primary shrink-0">
                <Icon icon="solar:box-minimalistic-bold" width={22} height={22} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-lg font-bold font-heading text-dash-text leading-none">Zetca</h1>
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                </div>
                <p className="text-[10px] font-semibold text-dash-text-muted tracking-[0.15em] mt-1">
                  CONTENT OS
                </p>
              </div>
            </Link>
          </div>

          {/* Section label */}
          <p className="px-6 text-[10px] font-semibold text-dash-text-muted tracking-[0.15em] mb-3">
            PLATFORM SUITE
          </p>

          {/* Dashboard Button */}
          <div className="px-5 mb-4">
            <Link
              href="/dashboard"
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200 min-h-[44px]
                ${
                  pathname === '/dashboard'
                    ? 'text-white shadow-lg gradient-primary'
                    : 'text-dash-text-secondary hover:bg-dash-card hover:text-dash-text'
                }
              `}
            >
              <Icon icon="solar:widget-5-bold" width={20} height={20} />
              <span className="font-semibold text-sm">Dashboard</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-5" aria-label="Dashboard pages">
            <ul className="space-y-1" role="list">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-4 py-3 rounded-xl
                        transition-all duration-200 group min-h-[44px]
                        ${
                          isActive
                            ? 'text-white shadow-lg gradient-primary'
                            : 'text-dash-text-secondary hover:bg-dash-card hover:text-dash-text'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon
                        icon={isActive ? item.icon : item.icon.replace('-bold', '-linear')}
                        width={20}
                        height={20}
                        className={isActive ? 'text-white' : 'text-dash-text-muted group-hover:text-dash-text-secondary'}
                        aria-hidden="true"
                      />
                      <span className="font-semibold text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* AI Growth Boost CTA */}
          <div className="px-5 pb-5 pt-4">
            <div className="rounded-2xl p-4 bg-gradient-to-br from-primary/20 via-dash-card to-dash-card border border-dash-border-strong">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center gradient-primary mb-3">
                <Icon icon="solar:bolt-bold" width={18} height={18} className="text-white" />
              </div>
              <h3 className="text-sm font-bold text-dash-text mb-1">AI Growth Boost</h3>
              <p className="text-xs text-dash-text-secondary leading-relaxed mb-3">
                Create, schedule, &amp; scale multichannel content in 1-click.
              </p>
              <Link
                href="/dashboard/strategist"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white gradient-primary rounded-lg px-3 py-2 hover:opacity-90 transition-opacity"
              >
                Learn More
                <Icon icon="solar:arrow-right-linear" width={14} height={14} />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 flex items-center justify-between border-t border-dash-border">
            <p className="text-[11px] text-dash-text-muted">© 2026 Zetca</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="text-[11px] text-dash-text-muted">v2.4 Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
