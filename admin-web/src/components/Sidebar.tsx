import Link from 'next/link';
import { LayoutDashboard, Building2, Users, Contact, ShieldCheck, SlidersHorizontal, ScrollText } from 'lucide-react';
import { SidebarLink } from './SidebarLink';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/branches', label: 'Branches', icon: Building2, permission: 'branch.view' },
  { href: '/dashboard/employees', label: 'Employees', icon: Users, permission: 'employee.view' },
  { href: '/dashboard/customers', label: 'Customers', icon: Contact, permission: 'customer.view' },
  { href: '/dashboard/roles', label: 'Roles & Permissions', icon: ShieldCheck, permission: 'role.view' },
  { href: '/dashboard/settings', label: 'Configuration', icon: SlidersHorizontal, permission: 'setting.view' },
  { href: '/dashboard/audit-logs', label: 'Audit Logs', icon: ScrollText, permission: 'audit_log.view' },
];

export function Sidebar({ permissions }: { permissions: string[] }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-navy-950 text-white lg:flex">
      <Link href="/dashboard" className="flex items-center gap-2.5 px-6 py-6">
        <svg width="26" height="26" viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="17" cy="15" rx="8.5" ry="10.5" fill="#CFA23A" />
          <path d="M4 21C4 21 8 25 17 25C26 25 30 21 30 21" stroke="#B8862A" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
        <span className="font-display text-lg font-semibold">Goldnest</span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.filter((item) => !item.permission || permissions.includes(item.permission)).map((item) => (
          <SidebarLink key={item.href} href={item.href} icon={<item.icon size={17} />} label={item.label} />
        ))}
      </nav>

      <div className="border-t border-white/5 px-6 py-4 text-[11px] text-white/30">Internal use only — all access logged.</div>
    </aside>
  );
}
