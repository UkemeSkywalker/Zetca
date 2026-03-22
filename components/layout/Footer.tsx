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
    <footer className={`bg-on-surface text-surface-container-high ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 mb-8">
          <Link href="/" className="text-2xl font-bold font-heading text-surface-container-lowest">
            Zetca
          </Link>

          <nav className="flex flex-wrap justify-center gap-6">
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-surface-container-high hover:text-surface-container-lowest transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex space-x-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="text-outline hover:text-surface-container-lowest transition-colors duration-200"
              >
                <Icon icon={social.icon} className="w-6 h-6" />
              </a>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(165, 173, 198, 0.2)' }} className="pt-6">
          <p className="text-sm text-outline text-center">
            © {currentYear} Zetca. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
