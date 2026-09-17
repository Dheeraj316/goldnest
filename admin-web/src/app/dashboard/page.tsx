import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Users, Contact, ClipboardCheck, ArrowRight, ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser } from '@/lib/auth';
import type { Branch, Employee, ConfigurationVersion, AuditLog, Paginated } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Dashboard' };

async function safe<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [branches, employees, customers, pendingChanges, recentAudit] = await Promise.all([
    safe(apiFetch<Branch[]>('/branches'), []),
    safe(apiFetch<Employee[]>('/employees'), []),
    safe(apiFetch<Paginated<unknown>>('/customers?pageSize=1'), { items: [], total: 0, page: 1, pageSize: 1 }),
    safe(apiFetch<ConfigurationVersion[]>('/settings/pending-changes'), []),
    safe(apiFetch<Paginated<AuditLog>>('/audit-logs?pageSize=6'), { items: [], total: 0, page: 1, pageSize: 6 }),
  ]);

  return (
    <div>
      <PageHeader title="Dashboard" description="Live counts from the Goldnest platform." />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Branches" value={branches.length} icon={Building2} />
        <StatCard label="Employees" value={employees.length} icon={Users} />
        <StatCard label="Customers" value={customers.total} icon={Contact} />
        <StatCard label="Pending approvals" value={pendingChanges.length} icon={ClipboardCheck} hint="Configuration changes awaiting a second approver" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Pending configuration approvals</h2>
            <Link href="/dashboard/settings" className="flex items-center gap-1 text-sm font-medium text-gold-600 hover:text-gold-700">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {pendingChanges.length === 0 ? (
            <p className="mt-6 text-sm text-ink-light/60">Nothing pending — all configuration changes are settled.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gold-100">
              {pendingChanges.slice(0, 5).map((change) => (
                <li key={change.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{change.setting?.key}</p>
                    <p className="text-xs text-ink-light/60">Requested {formatDateTime(change.requestedAt)}</p>
                  </div>
                  {change.requestedBy === user?.userId && (
                    <span className="badge bg-gold-50 text-gold-700">You requested this</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Recent activity</h2>
            <Link href="/dashboard/audit-logs" className="flex items-center gap-1 text-sm font-medium text-gold-600 hover:text-gold-700">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {recentAudit.items.length === 0 ? (
            <p className="mt-6 text-sm text-ink-light/60">No activity recorded yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-gold-100">
              {recentAudit.items.map((log) => (
                <li key={log.id} className="flex items-start gap-3 py-3">
                  <ScrollText size={15} className="mt-0.5 shrink-0 text-gold-500" />
                  <div>
                    <p className="text-sm font-medium text-ink">{log.action}</p>
                    <p className="text-xs text-ink-light/60">{formatDateTime(log.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
