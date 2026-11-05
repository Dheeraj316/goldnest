import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Branch, CashDaySummary, CashHistoryItem, Paginated } from '@/lib/types';
import { formatDateTime, formatTime } from '@/lib/format';
import { CashDayActions } from './CashDayActions';

export const metadata: Metadata = { title: 'Cash Register' };

export default async function CashPage({ searchParams }: { searchParams: Promise<{ branchId?: string }> }) {
  const { branchId: qBranchId } = await searchParams;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'cash.manage');
  const branchId = qBranchId || user?.branchId;

  const suffix = branchId ? `?branchId=${branchId}` : '';
  const [summary, history] = branchId
    ? await Promise.all([apiFetch<CashDaySummary>(`/cash-management/today${suffix}`), apiFetch<Paginated<CashHistoryItem>>(`/cash-management/history${suffix}`)])
    : [null, null];

  const needsBranchPicker = !branchId;
  const branches = needsBranchPicker ? await apiFetch<Branch[]>('/branches') : [];

  return (
    <div>
      <PageHeader title="Cash Register" description="The physical till at a branch — opened each day, receipts and disbursements recorded through it, and closed against a counted balance." />

      {needsBranchPicker && (
        <div className="card mb-6 p-5">
          <p className="mb-3 text-sm text-ink-light">Choose a branch to view its register.</p>
          <div className="flex flex-wrap gap-2">
            {branches.map((b) => (
              <Link key={b.id} href={`/dashboard/cash?branchId=${b.id}`} className="rounded-full border border-navy-900/15 px-4 py-1.5 text-sm font-medium text-ink-light hover:border-gold-300">
                {b.code} · {b.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {summary && (
        <div className="card mb-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">{summary.date}</p>
              <p className="text-xs text-ink-light">
                {summary.isClosed ? 'Closed for the day' : summary.isOpen ? 'Open' : 'Not opened yet'} · Expected balance ₹{summary.expectedBalance}
              </p>
            </div>
            {canManage && <CashDayActions branchId={summary.branchId} isOpen={summary.isOpen} isClosed={summary.isClosed} expectedBalance={summary.expectedBalance} />}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Reference</th>
                  <th className="px-3 py-2">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {summary.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={e.type} />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-ink">₹{e.amount}</td>
                    <td className="px-3 py-2.5 text-ink-light">{e.reference ?? '—'}</td>
                    <td className="px-3 py-2.5 text-ink-light">{formatTime(e.createdAt)}</td>
                  </tr>
                ))}
                {summary.entries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-ink-light/60">
                      Nothing recorded yet today.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history && (
        <div className="card overflow-hidden">
          <p className="border-b border-gold-100 bg-gold-50/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-light/70">Closing history</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Closed</th>
                  <th className="px-5 py-3">Counted amount</th>
                  <th className="px-5 py-3">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {history.items.map((h) => (
                  <tr key={h.id}>
                    <td className="px-5 py-3.5 text-ink-light">
                      {h.branch.code} · {h.branch.name}
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">{formatDateTime(h.createdAt)}</td>
                    <td className="px-5 py-3.5 font-medium text-ink">₹{h.amount}</td>
                    <td className="px-5 py-3.5 text-ink-light">{h.reference ?? '—'}</td>
                  </tr>
                ))}
                {history.items.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-ink-light/60">
                      No days closed yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
