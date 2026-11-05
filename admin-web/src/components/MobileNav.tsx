'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { NAV } from '@/lib/nav';

// The only way to navigate below the `lg` breakpoint, where Sidebar renders nothing at all
// (`hidden ... lg:flex`) — without this, a phone or tablet viewer could only reach a page by
// typing its URL directly.
export function MobileNav({ permissions }: { permissions: string[] }) {
  const [open, setOpen] = useState(false);
  // The drawer portals to document.body (see below) — only real once mounted client-side,
  // so this stays false through SSR/hydration and flips true a tick after.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);
  // Close on navigation, and don't let the page scroll behind an open drawer.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const items = NAV.filter((item) => !item.permission || permissions.includes(item.permission));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/10 text-ink-light transition-colors hover:border-gold-300 hover:text-gold-700 lg:hidden"
      >
        <Menu size={18} />
      </button>

      {mounted && open && createPortal(
        // Portalled to <body> deliberately: the Topbar ancestor has `backdrop-blur`, and a
        // `backdrop-filter`/`filter`/`transform` on any ancestor makes it the containing block
        // for `position: fixed` descendants — the drawer would then be clipped to the Topbar's
        // own 64px height instead of covering the viewport. A portal escapes that ancestor chain.
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-sidebar-sheen text-white shadow-2xl">
            <div className="flex items-center justify-between px-5 py-5">
              <Link href="/dashboard" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="#CFA23A" />
                  <path d="M4 21C4 21 8 25 17 25C26 25 30 21 30 21" stroke="#B8862A" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                <span className="font-display text-lg font-semibold tracking-tight">Goldnest</span>
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pl-4 pb-4">
              {items.map((item) => {
                const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? 'bg-gradient-to-r from-white/12 to-white/[0.03] text-white' : 'text-white/50 hover:bg-white/[0.06] hover:text-white/90'
                    }`}
                  >
                    {isActive && <span className="absolute -left-3 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-gold-400" />}
                    <span className={isActive ? 'text-gold-300' : 'text-white/40 group-hover:text-white/70'}>
                      <item.icon size={17} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-white/[0.06] px-6 py-4 text-[11px] text-white/30">Internal use only — all access logged.</div>
          </aside>
        </div>,
        document.body,
      )}
    </>
  );
}
