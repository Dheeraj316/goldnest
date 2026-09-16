import Link from 'next/link';
import { Mail, Phone, MapPin } from 'lucide-react';
import { Logo } from './Logo';
import { COMPANY } from '@/lib/config';

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Products',
    links: [
      { href: '/gold-loan', label: 'Gold Loan' },
      { href: '/interest-charges', label: 'Interest & Charges' },
      { href: '/eligibility', label: 'Eligibility' },
      { href: '/documents-required', label: 'Documents Required' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About Us' },
      { href: '/branch-locator', label: 'Branch Locator' },
      { href: '/faq', label: 'FAQ' },
      { href: '/contact', label: 'Contact Us' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy-policy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms & Conditions' },
      { href: '/grievance', label: 'Grievance Redressal' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-navy-950 text-white/70">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo variant="light" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            Secure, transparent loans against gold jewellery — fast appraisal, fair value, and your gold safely vaulted
            until you choose to release it.
          </p>
          <div className="mt-6 space-y-2 text-sm">
            <div className="flex items-center gap-2 text-white/60">
              <Phone size={15} className="text-gold-300" /> {COMPANY.supportPhone}
            </div>
            <div className="flex items-center gap-2 text-white/60">
              <Mail size={15} className="text-gold-300" /> {COMPANY.supportEmail}
            </div>
          </div>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-white/60 transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <MapPin size={13} /> Regulatory disclosures and licensing status: see{' '}
            <Link href="/about#regulatory" className="underline decoration-white/30 underline-offset-2 hover:text-white">
              About Us
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
