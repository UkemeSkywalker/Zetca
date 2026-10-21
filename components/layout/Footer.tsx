'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ZetcaLogo } from './ZetcaLogo';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'FAQ', href: '/#faq' },
    ],
  },
  { title: 'Company', links: [{ label: 'hello@zetca.pro', href: 'mailto:hello@zetca.pro' }] },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith('/dashboard')) return null;

  return (
    <footer className="bg-white border-t border-slate-200 pt-16 pb-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-slate-200">
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Link href="/" aria-label="Zetca home" className="inline-block">
              <ZetcaLogo />
            </Link>
            <p className="text-sm text-[#777587]">Your AI content team.</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#0B1C30] mb-4">{col.title}</h2>
              <ul className="space-y-2.5 text-sm text-[#464555]">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="hover:text-[#0B1C30] transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="pt-8 text-center sm:text-left text-xs text-[#777587]">
          © {new Date().getFullYear()} Zetca. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
