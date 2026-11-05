import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import type { CollectionCaseListItem, CollectionsSummary, Paginated } from '@/lib/types';
import { RunSweepButton } from './RunSweepButton';

export const metadata: Metadata = { title: 'Collections' };

const TABS = [
  { key: 'open', label: 'Open', query: 'status=OPEN' },
  { key: 'mine', label: 'Assigned to me', query: 'status=OPEN&assignedToMe=true' },
  { key: 'closed', label: 'Closed', query: 'status=CLOSED' },
] as const;

function dpdTone(dpd: number) {
  if (dpd >= 30) return 'bg-rose-100 text-rose-700';
  if (dpd >= 7) return 'bg-rose-50 text-rose-600';
  return 'bg-gold-50 text-gold-700';
}

export default async function CollectionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  const user = await getCurrentUser();
  const canAssign = hasPermission(user, 'collection.assign');

  const [summary, result] = await Promise.all([
    apiFetch<CollectionsSummary>('/collections/summary'),
    apiFetch<Paginated<CollectionCaseListItem>>(`/collections/cases?${active.query}&pageSize=50`),
  ]);

  const tiles = [
    { label: 'Open cases', value: summary.openCases },
    { label: 'Unassigned', value: summary.unassigned },
    { label: 'Promises due today', value: summary.promisesDueToday },
    { label: 'Broken (7 days)', value: summary.brokenLast7Days },
  ];

  return (
    <div>
      <PageHeader
        title="Collections"
        description="Overdue loans and the follow-up on each. Loans move here automatically once they pass maturity plus the product's grace period."
        action={canAssign ? <RunSweepButton /> : undefined}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/70">{t.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-ink">{t.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/collections?tab=${t.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              t.key === active.key ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-900/15 text-ink-light hover:border-gold-300'
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
                <th className="px-5 py-3">Case</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">{active.key === 'closed' ? 'Closed because' : 'Days past due'}</th>
                <th className="px-5 py-3">Principal</th>
                <th className="px-5 py-3">Assigned to</th>
                <th className="px-5 py-3">Last contact</th>
                <th className="px-5 py-3">Next promise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {result.items.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/collections/${c.id}`} className="font-medium text-ink hover:text-gold-700">
                      {c.caseNumber}
                    </Link>
                    <p className="text-xs text-ink-light/70">{c.loan.loanNumber}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {c.customer.firstName} {c.customer.lastName ?? ''}
                    <p className="text-xs text-ink-light/70">{c.customer.mobile}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    {c.status === 'OPEN' ? (
                      <span className={`badge ${dpdTone(c.daysPastDue)}`}>
                        {c.daysPastDue} day{c.daysPastDue === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="text-xs text-ink-light/70">{c.closeReason}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">₹{Number(c.loan.principalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {c.assignee ? `${c.assignee.firstName} ${c.assignee.lastName ?? ''}` : <span className="text-rose-500">Unassigned</span>}
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {c.lastActivity ? (
                      <>
                        {c.lastActivity.type}
                        {c.lastActivity.outcome ? <span className="text-ink-light/60"> · {c.lastActivity.outcome.replace(/_/g, ' ')}</span> : null}
                        <p className="text-xs text-ink-light/70">{formatDate(c.lastActivity.occurredAt)}</p>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {c.nextPromise ? (
                      <>
                        ₹{Number(c.nextPromise.promisedAmount).toLocaleString('en-IN')}
                        <p className="text-xs text-ink-light/70">by {formatDate(c.nextPromise.promisedDate)}</p>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-light/60">
                    {active.key === 'closed' ? 'No closed cases yet.' : 'No overdue loans right now.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-light/60">Loans are picked up by the nightly sweep (00:30 IST) or the button above.</p>
    </div>
  );
}
