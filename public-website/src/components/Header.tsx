'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import { ADMIN_WEB_URL } from '@/lib/config';

const NAV_LINKS = [
  { href: '/gold-loan', label: 'Gold Loan' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/interest-charges', label: 'Interest & Charges' },
  { href: '/branch-locator', label: 'Branches' },
  { href: '/about', label: 'About' },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-gold-100/70 bg-cream-100/85 backdrop-blur-md">
      <div className="container-page flex h-[4.5rem] items-center justify-between py-3.5">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-ink-light transition hover:text-gold-600">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={ADMIN_WEB_URL} className="btn-secondary !px-5 !py-2.5 text-sm">
            Business Login
          </a>
          <Link href="/download" className="btn-primary !px-5 !py-2.5 text-sm">
            Get the App
          </Link>
        </div>

        <button
          aria-label="Toggle menu"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-200 text-ink lg:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gold-100 bg-cream-100 lg:hidden">
          <nav className="container-page flex flex-col gap-1 py-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-light hover:bg-gold-50 hover:text-gold-700"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-gold-100 pt-4">
              <a href={ADMIN_WEB_URL} className="btn-secondary w-full">
                Business Login
              </a>
              <Link href="/download" className="btn-primary w-full" onClick={() => setOpen(false)}>
                Get the App
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
