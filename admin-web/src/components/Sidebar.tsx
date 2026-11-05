import Link from 'next/link';
import { NAV } from '@/lib/nav';
import { SidebarLink } from './SidebarLink';

export function Sidebar({ permissions }: { permissions: string[] }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar-sheen text-white shadow-[4px_0_24px_-8px_rgba(10,15,26,0.25)] lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-6">
        <svg width="26" height="26" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="#CFA23A" />
          <path d="M4 21C4 21 8 25 17 25C26 25 30 21 30 21" stroke="#B8862A" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-lg font-semibold tracking-tight">Goldnest</span>
      </Link>

      <nav className="flex-1 space-y-0.5 px-3 pl-4">
        {NAV.filter((item) => !item.permission || permissions.includes(item.permission)).map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={<item.icon size={17} />} label={item.label} />
        ))}
      </nav>

      <div className="border-t border-white/[0.06] px-6 py-4 text-[11px] text-white/30">Internal use only — all access logged.</div>
    </aside>
  );
}
