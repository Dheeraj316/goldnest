'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

// Takes a pre-rendered icon element, not a component reference: a Server
// Component (Sidebar) can't pass a component *type* as a prop to a Client
// Component across the RSC boundary (only serializable data and already-
// rendered elements survive the crossing), so Sidebar renders `<Icon />`
// itself and hands this component the resulting element.
export function SidebarLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  const pathname = usePathname();
  const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
        isActive ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white/85'
      }`}
    >
      <span className={isActive ? 'text-gold-300' : ''}>{icon}</span>
      {label}
    </Link>
  );
}
