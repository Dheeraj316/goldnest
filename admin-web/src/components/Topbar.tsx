import { LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import type { CurrentUser } from '@/lib/auth';
import { MobileNav } from './MobileNav';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  REGIONAL_MANAGER: 'Regional Manager',
  BRANCH_MANAGER: 'Branch Manager',
  LOAN_OFFICER: 'Loan Officer',
  APPRAISER: 'Gold Appraiser',
  CASHIER: 'Cashier',
  COLLECTION_OFFICER: 'Collection Officer',
  AUDITOR: 'Auditor',
  CUSTOMER_SUPPORT: 'Customer Support',
  REPORTING_USER: 'Reporting User',
};

function initials(employeeId?: string) {
  return employeeId ? employeeId.slice(0, 2).toUpperCase() : '—';
}

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-gold-100/70 bg-white/80 px-4 backdrop-blur-md backdrop-saturate-150 sm:px-6">
      <MobileNav permissions={user.permissions} />
      <div className="flex items-center gap-3.5">
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
            {user.roleCode ? ROLE_LABELS[user.roleCode] || user.roleCode : '—'}
          </p>
          <p className="text-[11px] text-ink-light/60">Employee ID: {user.employeeId?.slice(0, 8)}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-navy-800 to-navy-950 text-[11px] font-bold text-gold-300 shadow-soft">
          {initials(user.employeeId)}
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/10 text-ink-light transition-all duration-200 ease-smooth hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
