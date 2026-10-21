'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@iconify/react';
import { ZetcaLogo } from './ZetcaLogo';

const navLinks = [
  { label: 'Tools', href: '/#features' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Channels', href: '/#platforms' },
  { label: 'Pricing', href: '/#pricing' },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <header className="sticky top-0 z-50 bg-[#F7F9FC]/90 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="Zetca home">
          <ZetcaLogo />
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[#464555]" aria-label="Main">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-[#0B1C30] transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden sm:inline-flex px-4 py-2.5 text-[15px] font-semibold text-[#0B1C30] hover:text-primary transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="px-4 sm:px-5 py-2.5 text-[15px] font-semibold text-white bg-primary hover:bg-primary-700 rounded-xl shadow-sm shadow-indigo-200 transition-colors"
          >
            Get started
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="md:hidden p-2.5 -mr-2 rounded-lg text-[#0B1C30] hover:bg-white"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <Icon icon={open ? 'solar:close-circle-linear' : 'solar:hamburger-menu-linear'} className="w-6 h-6" />
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-1" aria-label="Mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-4 py-3 text-base font-medium text-[#0B1C30] hover:bg-[#F7F9FC]"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="block rounded-lg px-4 py-3 text-base font-semibold text-[#0B1C30] hover:bg-[#F7F9FC] sm:hidden"
          >
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
