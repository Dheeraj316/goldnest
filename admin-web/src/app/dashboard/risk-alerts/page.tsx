import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Paginated, RiskAlert } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { ScanButton } from './ScanButton';
import { AlertReview } from './AlertReview';

export const metadata: Metadata = { title: 'Risk Alerts' };

const TABS = [
  { key: 'open', label: 'Open', statuses: ['OPEN', 'ESCALATED'] },
  { key: 'closed', label: 'Reviewed & dismissed', statuses: ['REVIEWED', 'DISMISSED'] },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function RiskAlertsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: Tab = (TABS.find((t) => t.key === tab)?.key ?? 'open') as Tab;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'risk.manage');

  // The list endpoint filters by one status at a time; each tab covers two statuses, so fetch and merge.
  const statuses = TABS.find((t) => t.key === active)!.statuses;
  const pages = await Promise.all(statuses.map((s) => apiFetch<Paginated<RiskAlert>>(`/risk-alerts?status=${s}&pageSize=100`)));
  const items = pages.flatMap((p) => p.items).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div>
      <PageHeader
        title="Risk Alerts"
        description="Automated flags from a nightly rule sweep: large loans, high loan-to-value, several loans open at once, severely overdue accounts, and rapid re-borrowing. Thresholds are starting values, pending compliance sign-off."
        action={canManage ? <ScanButton /> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/risk-alerts?tab=${t.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              t.key === active ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-900/15 text-ink-light hover:border-gold-300'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                <th className="px-5 py-3">Rule</th>
                <th className="px-5 py-3">Severity</th>
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Raised</th>
                {canManage && active === 'open' && <th className="px-5 py-3 text-right">Review</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {items.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-3.5 font-medium text-ink">{a.ruleLabel}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={a.severity} />
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {a.subjectType} <span className="text-ink-light/70">·</span> {a.subjectLabel ?? a.subjectId}
                  </td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">{formatDateTime(a.createdAt)}</td>
                  {canManage && active === 'open' && (
                    <td className="px-5 py-3.5 text-right">
                      <AlertReview id={a.id} />
                    </td>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={canManage && active === 'open' ? 6 : 5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                    {active === 'open' ? 'No open alerts right now.' : 'Nothing has been reviewed or dismissed yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
