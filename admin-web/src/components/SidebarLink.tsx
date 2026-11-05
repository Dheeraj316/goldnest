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
      className={`group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-smooth ${
        isActive
          ? 'bg-gradient-to-r from-white/12 to-white/[0.03] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
          : 'text-white/50 hover:bg-white/[0.06] hover:text-white/90'
      }`}
    >
      {isActive && <span className="absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold-400" />}
      <span className={`transition-colors duration-200 ${isActive ? 'text-gold-300' : 'text-white/40 group-hover:text-white/70'}`}>{icon}</span>
      {label}
    </Link>
  );
}
