import { LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/actions/auth';
import type { CurrentUser } from '@/lib/auth';

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

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-end border-b border-gold-100 bg-white px-6">
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">
            {user.roleCode ? ROLE_LABELS[user.roleCode] || user.roleCode : '—'}
          </p>
          <p className="text-[11px] text-ink-light/60">Employee ID: {user.employeeId?.slice(0, 8)}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="flex h-9 w-9 items-center justify-center rounded-full border border-navy-900/10 text-ink-light transition hover:border-rose-300 hover:text-rose-600" title="Sign out">
            <LogOut size={15} />
          </button>
        </form>
      </div>
    </header>
  );
}
