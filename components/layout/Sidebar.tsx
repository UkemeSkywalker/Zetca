'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  isAgentTool: boolean;
}

const navItems: NavItem[] = [
  { label: 'Strategist', href: '/dashboard/strategist', icon: 'solar:lightbulb-bolt-bold', isAgentTool: true },
  { label: 'Copywriter', href: '/dashboard/copywriter', icon: 'solar:pen-bold', isAgentTool: true },
  { label: 'Scheduler', href: '/dashboard/scheduler', icon: 'solar:calendar-bold', isAgentTool: true },
  { label: 'Designer', href: '/dashboard/designer', icon: 'solar:palette-bold', isAgentTool: true },
  { label: 'Publisher', href: '/dashboard/publisher', icon: 'solar:send-square-bold', isAgentTool: true },
  { label: 'Analysis', href: '/dashboard/analysis', icon: 'solar:chart-bold', isAgentTool: false },
  { label: 'Profile', href: '/dashboard/profile', icon: 'solar:user-bold', isAgentTool: false },
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
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white text-gray-700 rounded-lg shadow-md"
        aria-label="Toggle menu"
      >
        <Icon icon={isMobileMenuOpen ? 'solar:close-square-bold' : 'solar:hamburger-menu-bold'} width={24} height={24} />
      </button>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 z-40
          transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">Z</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Zetca</h1>
            </Link>
          </div>

          {/* Dashboard Button */}
          <div className="px-5 mb-6">
            <Link
              href="/dashboard"
              className={`
                flex items-center justify-center gap-3 px-5 py-3.5 rounded-lg
                transition-all duration-200
                ${
                  pathname === '/dashboard'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }
              `}
            >
              <Icon icon="solar:widget-bold" width={22} height={22} />
              <span className="font-bold text-base">Dashboard</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-5">
            <ul className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-4 px-4 py-3.5 rounded-lg
                        transition-all duration-200 group
                        ${
                          isActive
                            ? 'bg-gray-100 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon 
                        icon={item.icon} 
                        width={22} 
                        height={22}
                        className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                      />
                      <span className="font-bold text-base">{item.label}</span>
                      {isActive && (
                        <Icon 
                          icon="solar:alt-arrow-right-linear" 
                          width={18} 
                          height={18}
                          className="ml-auto text-gray-400"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div className="px-5 py-5 border-t border-gray-200">
            <p className="text-sm text-gray-500 font-medium">© 2024 Zetca</p>
          </div>
        </div>
      </aside>
    </>
  );
}
