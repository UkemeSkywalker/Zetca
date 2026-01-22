'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@iconify/react';

interface NavLink {
  label: string;
  href: string;
  hasDropdown?: boolean;
}

const navLinks: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Features', href: '/features', hasDropdown: true },
  { label: 'Pricing', href: '/pricing', hasDropdown: true },
  { label: 'Dashboard', href: '/dashboard' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGetStartedOpen, setIsGetStartedOpen] = useState(false);

  const isActiveLink = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="w-full pt-4 px-4 sm:px-6 lg:px-8">
      <nav className="bg-white shadow-sm rounded-2xl max-w-7xl mx-auto">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center" 
                style={{ background: 'linear-gradient(45deg, var(--colors--linear-color-01), var(--colors--linear-color-02))' }}
              >
                <Icon icon="solar:bolt-bold" className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Zetca.</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? 'text-[#3139FB]'
                      : 'text-gray-700 hover:text-[#3139FB]'
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" />
                  )}
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Get Started Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsGetStartedOpen(!isGetStartedOpen)}
                  className="flex items-center gap-2 px-6 py-5 text-white text-sm font-semibold rounded-lg transition-all shadow-sm"
                  style={{ background: 'linear-gradient(45deg, var(--colors--linear-color-01), var(--colors--linear-color-02))' }}
                >
                  Get Started
                  <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {isGetStartedOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsGetStartedOpen(false)}
                    />
                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
                      <Link
                        href="/login"
                        onClick={() => setIsGetStartedOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 transition-colors"
                        style={{ 
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EEF0FF';
                          e.currentTarget.style.color = '#3139FB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#374151';
                        }}
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setIsGetStartedOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 transition-colors"
                        style={{ 
                          backgroundColor: 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#EEF0FF';
                          e.currentTarget.style.color = '#3139FB';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#374151';
                        }}
                      >
                        Sign Up
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <Icon
                icon={isMobileMenuOpen ? 'solar:close-square-bold' : 'solar:hamburger-menu-bold'}
                className="w-6 h-6 text-gray-700"
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? 'text-[#3139FB]'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                  style={isActiveLink(link.href) ? { backgroundColor: '#EEF0FF' } : {}}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" />
                  )}
                </Link>
              ))}
              <div className="pt-3 border-t border-gray-200 space-y-2">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-white text-sm font-semibold rounded-lg text-center transition-all"
                  style={{ background: 'linear-gradient(45deg, var(--colors--linear-color-01), var(--colors--linear-color-02))' }}
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 border-2 text-sm font-semibold rounded-lg text-center transition-all"
                  style={{ borderColor: '#3139FB', color: '#3139FB' }}
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
