import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';
import type { AuctionCandidate, AuctionListItem, Paginated } from '@/lib/types';
import { StartAuctionButton } from './StartAuctionButton';

export const metadata: Metadata = { title: 'Auctions' };

const TABS = [
  { key: 'open', label: 'In progress' },
  { key: 'candidates', label: 'Candidates' },
  { key: 'closed', label: 'Completed & cancelled' },
] as const;

type Tab = (typeof TABS)[number]['key'];

export default async function AuctionsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: Tab = (TABS.find((t) => t.key === tab)?.key ?? 'open') as Tab;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'auction.manage');

  const [open, closed, candidates] = await Promise.all([
    apiFetch<Paginated<AuctionListItem>>('/auctions?open=true&pageSize=100'),
    apiFetch<Paginated<AuctionListItem>>('/auctions?open=false&pageSize=100'),
    apiFetch<{ minOverdueDays: number; items: AuctionCandidate[] }>('/auctions/candidates'),
  ]);
  const counts: Record<Tab, number> = { open: open.total, candidates: candidates.items.length, closed: closed.total };

  return (
    <div>
      <PageHeader
        title="Auctions"
        description="Gold on loans that stayed unpaid, taken through notice, approval, sale and settlement. Every step is recorded, and the borrower can redeem right up to the sale."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/auctions?tab=${t.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              t.key === active ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-900/15 text-ink-light hover:border-gold-300'
            }`}
          >
            {t.label} <span className="ml-1 text-xs opacity-70">{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      {active === 'candidates' ? (
        <div className="card overflow-hidden">
          <p className="border-b border-gold-100 bg-gold-50/40 px-5 py-3 text-xs text-ink-light">
            Overdue loans with pledged gold that are at least <strong>{candidates.minOverdueDays} days</strong> past due and have no auction in progress. Starting an auction only
            puts the loan forward — nothing is sold until it has been valued, noticed, approved and scheduled.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="px-5 py-3">Loan</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Principal</th>
                  <th className="px-5 py-3">Days past due</th>
                  {canManage && <th className="px-5 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {candidates.items.map((c) => (
                  <tr key={c.loanId}>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/loans/${c.loanId}`} className="font-medium text-ink hover:text-gold-700">
                        {c.loanNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">
                      {c.customer.firstName} {c.customer.lastName ?? ''}
                      <p className="text-xs text-ink-light/70">{c.customer.customerCode}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">{c.branch.code}</td>
                    <td className="px-5 py-3.5 text-ink-light">{formatMoney(c.principalAmount)}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge bg-rose-50 text-rose-600">{c.daysPastDue} days</span>
                    </td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <StartAuctionButton loanId={c.loanId} loanNumber={c.loanNumber} />
                      </td>
                    )}
                  </tr>
                ))}
                {candidates.items.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                      No loans are ready for auction.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="px-5 py-3">Auction</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Principal</th>
                  <th className="px-5 py-3">{active === 'open' ? 'Reserve price' : 'Sale price'}</th>
                  <th className="px-5 py-3">{active === 'open' ? 'Next date' : 'Surplus'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {(active === 'open' ? open : closed).items.map((a) => (
                  <tr key={a.id}>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/auctions/${a.id}`} className="font-medium text-ink hover:text-gold-700">
                        {a.auctionNumber}
                      </Link>
                      <p className="text-xs text-ink-light/70">{a.loan.loanNumber}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">
                      {a.customer.firstName} {a.customer.lastName ?? ''}
                      <p className="text-xs text-ink-light/70">{a.customer.customerCode}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">{formatMoney(a.loan.principalAmount)}</td>
                    <td className="px-5 py-3.5 text-ink-light">{active === 'open' ? (a.reservePrice ? formatMoney(a.reservePrice) : '—') : a.salePrice ? formatMoney(a.salePrice) : '—'}</td>
                    <td className="px-5 py-3.5 text-ink-light">
                      {active === 'open'
                        ? a.scheduledDate
                          ? `Auction ${formatDate(a.scheduledDate)}`
                          : a.noticePeriodEndsAt
                            ? `Notice ends ${formatDate(a.noticePeriodEndsAt)}`
                            : '—'
                        : a.surplusAmount && Number(a.surplusAmount) > 0
                          ? formatMoney(a.surplusAmount)
                          : '—'}
                    </td>
                  </tr>
                ))}
                {(active === 'open' ? open : closed).items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-light/60">
                      {active === 'open' ? 'No auctions in progress.' : 'Nothing completed or cancelled yet.'}
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
