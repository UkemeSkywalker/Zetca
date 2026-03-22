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
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  const isActiveLink = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 sm:px-6 lg:px-8">
      {/* Glassmorphism nav */}
      <nav className="glass-nav rounded-full max-w-6xl mx-auto" style={{ border: '1px solid var(--ghost-border)' }}>
        <div className="px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center gradient-primary">
                <Icon icon="simple-icons:speedypage" className="w-4 h-4 text-on-primary" />
              </div>
              <span className="text-xl font-bold font-heading text-on-surface">Zetca.</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-8 flex-1 justify-center">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1 text-base font-medium transition-colors whitespace-nowrap ${
                    isActiveLink(link.href)
                      ? 'text-primary'
                      : 'text-on-surface/70 hover:text-primary'
                  }`}
                  aria-current={isActiveLink(link.href) ? 'page' : undefined}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" aria-hidden="true" />
                  )}
                </Link>
              ))}
            </div>

            {/* Right Side Actions */}
            <div className="hidden lg:flex items-center gap-4 flex-shrink-0">
              <Link
                href="/login"
                className="text-base font-medium text-on-surface/70 hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2.5 text-on-primary text-base font-semibold rounded-full transition-all shadow-ambient-sm hover:shadow-ambient gradient-primary"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-3 rounded-lg hover:bg-surface-container-low transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              <Icon
                icon={isMobileMenuOpen ? 'solar:close-square-bold' : 'solar:hamburger-menu-bold'}
                className="w-6 h-6 text-on-surface"
              />
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden rounded-b-3xl" style={{ borderTop: '1px solid var(--ghost-border)' }} role="navigation" aria-label="Mobile navigation">
            <div className="px-4 py-4 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium transition-colors min-h-[44px] ${
                    isActiveLink(link.href)
                      ? 'text-primary bg-primary/5'
                      : 'text-on-surface/70 hover:bg-surface-container-low'
                  }`}
                >
                  {link.label}
                  {link.hasDropdown && (
                    <Icon icon="solar:alt-arrow-down-linear" className="w-4 h-4" />
                  )}
                </Link>
              ))}
              <div className="pt-3 space-y-2" style={{ borderTop: '1px solid var(--ghost-border)' }}>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-on-surface/70 text-base font-medium rounded-lg text-center transition-all min-h-[44px] flex items-center justify-center hover:bg-surface-container-low"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block w-full px-4 py-3 text-on-primary text-base font-semibold rounded-full text-center transition-all min-h-[44px] flex items-center justify-center gradient-primary"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
