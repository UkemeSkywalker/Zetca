'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { ZetcaLogo } from './ZetcaLogo';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  /** A sub-menu that opens under the item (like WordPress) */
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: 'lucide:layout-grid' },
  { label: 'Strategist', href: '/dashboard/strategist', icon: 'lucide:lightbulb' },
  { label: 'Copywriter', href: '/dashboard/copywriter', icon: 'lucide:pencil' },
  { label: 'Scheduler', href: '/dashboard/scheduler', icon: 'lucide:calendar' },
  {
    label: 'Designer',
    href: '/dashboard/designer',
    icon: 'lucide:image',
    children: [
      { label: 'New design', href: '/dashboard/designer/new' },
      { label: 'Photo editor', href: '/dashboard/designer/blank' },
      { label: 'My designs', href: '/dashboard/designer/library' },
    ],
  },
  { label: 'Publisher', href: '/dashboard/publisher', icon: 'lucide:navigation-2' },
  { label: 'Analysis', href: '/dashboard/analysis', icon: 'lucide:chart-column' },
  { label: 'Billing', href: '/dashboard/billing', icon: 'lucide:coins' },
  { label: 'Profile', href: '/dashboard/profile', icon: 'lucide:user' },
];

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Sub-menus opened with their caret (they also open on hover, and stay open in their section)
  const [openMenus, setOpenMenus] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const toggleMenu = (href: string) =>
    setOpenMenus((s) => {
      const next = new Set(s);
      if (next.has(href)) next.delete(href);
      else next.add(href);
      return next;
    });

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-dash-card text-dash-text rounded-lg shadow-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <Icon icon={isMobileMenuOpen ? 'lucide:x' : 'lucide:menu'} width={22} height={22} />
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
          fixed top-0 left-0 h-screen w-[248px] bg-dash-sidebar z-40 font-heading
          border-r border-white/5
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${className}
        `}
        aria-label="Main navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-[78px] px-[30px] flex items-center border-b border-white/5">
            <Link href="/" className="hover:opacity-80 transition-opacity" aria-label="Zetca home">
              <ZetcaLogo tone="light" />
            </Link>
          </div>

          {/* Section label */}
          <p className="px-[33px] pt-6 text-[10.5px] font-bold text-slate-400 tracking-[0.08em] mb-3">
            PLATFORM SUITE
          </p>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-[22px]" aria-label="Dashboard pages">
            <ul className="space-y-[7px]" role="list">
              {navItems.map((item) => {
                // Sub-pages (e.g. a strategy result) keep their section highlighted
                const isActive = item.href === '/dashboard' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const open = !!item.children && (isActive || openMenus.has(item.href) || hovered === item.href);
                return (
                  <li
                    key={item.href}
                    onMouseEnter={item.children ? () => setHovered(item.href) : undefined}
                    onMouseLeave={item.children ? () => setHovered((h) => (h === item.href ? null : h)) : undefined}
                  >
                    <div className="relative">
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-[14px] h-9 rounded-lg
                        transition-colors duration-200 group
                        ${
                          isActive
                            ? 'bg-indigo-600 text-white shadow-[0_8px_20px_rgba(79,70,229,0.35)]'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }
                      `}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon icon={item.icon} width={17} height={17} className="text-inherit" aria-hidden="true" />
                      {/* text-inherit overrides the global span color from globals.css */}
                      <span className="text-[13.5px] font-medium text-inherit">{item.label}</span>
                    </Link>
                    {item.children && (
                      <button
                        type="button"
                        onClick={() => toggleMenu(item.href)}
                        aria-expanded={open}
                        aria-controls={`submenu-${item.label}`}
                        aria-label={`${open ? 'Hide' : 'Show'} ${item.label} pages`}
                        className={`absolute right-1 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md ${isActive ? 'text-white hover:bg-white/15' : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'}`}
                      >
                        <Icon icon="lucide:chevron-down" width={15} height={15} className={`text-inherit transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                      </button>
                    )}
                    </div>
                    {item.children && open && (
                      <ul id={`submenu-${item.label}`} className="mt-1 mb-1 ml-[22px] space-y-0.5 border-l border-white/10 pl-3" role="list">
                        {item.children.map((child) => {
                          const childActive = pathname === child.href || (child.href === '/dashboard/designer/library' && pathname.startsWith(`${child.href}/`));
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                aria-current={childActive ? 'page' : undefined}
                                className={`flex h-8 items-center rounded-md px-3 text-[13px] transition-colors ${childActive ? 'bg-white/10 font-semibold text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                              >
                                <span className="text-inherit">{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* AI Growth Boost CTA */}
          <div className="px-[22px] pb-4 pt-4 border-t border-white/5">
            <div className="rounded-xl p-4 bg-[#121735] border border-[#1f2547]">
              <div className="w-[30px] h-[30px] rounded-md flex items-center justify-center bg-[#1e2350] border border-[#2c3170] mb-3">
                <Icon icon="lucide:zap" width={15} height={15} className="text-indigo-300" />
              </div>
              <h3 className="text-[12.5px] font-semibold text-white mb-1.5">AI Growth Boost</h3>
              <p className="text-[11px] text-slate-400 leading-[1.5] mb-3.5">
                Create, schedule, &amp; scale multichannel content in 1-click.
              </p>
              <Link
                href="/dashboard/strategist"
                className="flex w-full items-center justify-center gap-1.5 h-[26px] text-[11.5px] font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors"
              >
                <span className="text-inherit">Learn More</span>
                <Icon icon="lucide:arrow-right" width={13} height={13} />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="px-[26px] pb-4 pt-1 flex items-center justify-between">
            <p className="text-[10.5px] text-slate-500">© 2026 Zetca OS</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="text-[10.5px] text-slate-500">v2.4 Active</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
