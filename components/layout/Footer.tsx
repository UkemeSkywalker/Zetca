'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

interface FooterLink {
  label: string;
  href: string;
}

const footerLinks: FooterLink[] = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'About', href: '#' },
  { label: 'Contact', href: '#' },
];

const socialLinks = [
  { name: 'Instagram', icon: 'solar:instagram-bold', href: '#' },
  { name: 'Twitter', icon: 'solar:twitter-bold', href: '#' },
  { name: 'LinkedIn', icon: 'solar:linkedin-bold', href: '#' },
  { name: 'Facebook', icon: 'solar:facebook-bold', href: '#' },
];

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={`bg-gray-900 text-gray-300 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 mb-8">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold text-white">
            Zetca
          </Link>

          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="hover:text-white transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Social Media Icons */}
          <div className="flex space-x-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                <Icon icon={social.icon} className="w-6 h-6" />
              </a>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 pt-6">
          <p className="text-sm text-gray-400 text-center">
            © {currentYear} Zetca. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
