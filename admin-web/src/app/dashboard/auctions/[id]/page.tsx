import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, FileText } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, ApiError } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import type { AuctionDetail, AuctionStatus } from '@/lib/types';
import { AuctionActions } from './AuctionActions';

export const metadata: Metadata = { title: 'Auction' };

const STEPS: { label: string; reached: AuctionStatus[] }[] = [
  { label: 'Put forward', reached: ['CANDIDATE', 'UNDER_REVIEW', 'NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'SETTLED'] },
  { label: 'Valued', reached: ['UNDER_REVIEW', 'NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'SETTLED'] },
  { label: 'Notice given', reached: ['NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'SETTLED'] },
  { label: 'Approved', reached: ['APPROVED', 'SCHEDULED', 'COMPLETED', 'SETTLED'] },
  { label: 'Scheduled', reached: ['SCHEDULED', 'COMPLETED', 'SETTLED'] },
  { label: 'Sold', reached: ['COMPLETED', 'SETTLED'] },
  { label: 'Settled', reached: ['SETTLED'] },
];

const ACCOUNT_LABEL: Record<string, string> = {
  INTEREST_INCOME: 'Applied to interest',
  FEE_INCOME: 'Applied to charges',
  LOAN_PRINCIPAL_RECEIVABLE: 'Applied to principal',
  CUSTOMER_SURPLUS_PAYABLE: 'Surplus held for the borrower',
  CASH: 'Surplus paid to the borrower',
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-light">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, a] = await Promise.all([
    getCurrentUser(),
    apiFetch<AuctionDetail>(`/auctions/${id}`).catch((e) => {
      if (e instanceof ApiError && (e.status === 404 || e.status === 400)) notFound();
      throw e;
    }),
  ]);
  const can = { manage: hasPermission(user, 'auction.manage'), approve: hasPermission(user, 'auction.approve'), settle: hasPermission(user, 'auction.settle'), writeoff: hasPermission(user, 'auction.writeoff') };
  const bd = a.saleBreakdown;
  const cancelled = a.status === 'CANCELLED';
  // The borrower's notice can be printed while it is still current (after it has gone out, until the sale or cancellation).
  const noticeLive = !!a.noticeSentAt && ['NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'].includes(a.status);

  return (
    <div>
      <Link href="/dashboard/auctions" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700">
        <ArrowLeft size={14} /> Back to auctions
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{a.auctionNumber}</h1>
          <p className="mt-1 text-sm text-ink-light">
            <Link href={`/dashboard/loans/${a.loan.id}`} className="font-medium text-gold-700 hover:underline">
              {a.loan.loanNumber}
            </Link>{' '}
            · {a.customer.firstName} {a.customer.lastName ?? ''} ({a.customer.customerCode}) · {a.loan.branch.name}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      {cancelled ? (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-ink" role="status">
          <strong>Cancelled</strong>
          {a.cancelledAt ? ` on ${formatDateTime(a.cancelledAt)}` : ''}
          {a.people.cancelledBy ? ` by ${a.people.cancelledBy}` : ''}. Reason: {a.cancelReason ?? '—'}
        </div>
      ) : (
        <ol className="mb-6 grid grid-cols-7 gap-1.5" aria-label="Auction progress">
          {STEPS.map((step) => {
            const done = step.reached.includes(a.status);
            return (
              <li key={step.label} className="text-center">
                <div className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {done ? <Check size={14} aria-label="done" /> : ''}
                </div>
                <p className={`mt-1.5 text-[11px] leading-tight ${done ? 'font-medium text-ink' : 'text-ink-light/60'}`}>{step.label}</p>
              </li>
            );
          })}
        </ol>
      )}

      {a.config.usingDefaults.length > 0 && (
        <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800" role="note">
          Some auction rules are still using built-in placeholder values ({a.config.usingDefaults.join(', ')}). Set the approved figures in Configuration.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <AuctionActions auction={a} can={can} myEmployeeId={user?.employeeId} />

          {a.shortfall && (
            <section className="card border-rose-200 p-6" aria-label="Shortfall">
              <h2 className="font-display text-lg font-semibold text-ink">Money still owed after the sale</h2>
              <p className="mt-1 text-sm text-ink-light">
                The gold sold for less than the borrower owed. What is left stays their debt until it is recovered or written off. Payments are taken on the{' '}
                <Link href={`/dashboard/loans/${a.loan.id}`} className="font-medium text-gold-700 hover:underline">
                  loan page
                </Link>{' '}
                (interest first, then charges, then principal).
              </p>
              <dl className="mt-3">
                <Row label="Left owing at the sale">{formatMoney(a.shortfall.atSale)}</Row>
                <Row label="Recovered since">{formatMoney(a.shortfall.recovered)}</Row>
                <Row label="Written off">{formatMoney(a.shortfall.writtenOff)}</Row>
                <Row label="Still owed now">
                  <span className={Number(a.shortfall.remaining) > 0.01 ? 'text-rose-600' : 'text-emerald-700'}>{formatMoney(a.shortfall.remaining)}</span>
                </Row>
                {bd?.writtenOff && (
                  <Row label="Write-off reason">
                    {bd.writtenOff.reason}
                    {a.people.writtenOffBy ? ` — ${a.people.writtenOffBy}` : ''}
                  </Row>
                )}
              </dl>
            </section>
          )}

          {a.bids.length > 0 && (
            <section className="card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Sale</h2>
              <p className="mt-1 text-sm text-ink-light">
                Sold to <strong className="text-ink">{a.buyerName}</strong> for <strong className="text-ink">{a.salePrice ? formatMoney(a.salePrice) : '—'}</strong>
                {a.completedAt ? ` on ${formatDateTime(a.completedAt)}` : ''}
                {a.people.saleRecordedBy ? `, recorded by ${a.people.saleRecordedBy}` : ''}.
              </p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                    <th className="py-2 pr-4">Bidder</th>
                    <th className="py-2 pr-4 text-right">Bid</th>
                    <th className="py-2"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {a.bids.map((b) => (
                    <tr key={b.id}>
                      <td className="py-2.5 pr-4 text-ink">{b.bidderName}</td>
                      <td className="py-2.5 pr-4 text-right text-ink">{formatMoney(b.bidAmount)}</td>
                      <td className="py-2.5 text-right">{b.isWinning && <span className="badge bg-emerald-50 text-emerald-700">Winning bid</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {bd && (
                <div className="mt-5 rounded-lg border border-gold-100 bg-gold-50/40 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gold-700">Where the money went</h3>
                  <dl className="mt-2">
                    <Row label="Owed at the time of sale">{bd.outstandingAtSale ? formatMoney(bd.outstandingAtSale.total) : '—'}</Row>
                    <Row label="Applied to interest">{formatMoney(bd.appliedToInterest ?? 0)}</Row>
                    <Row label="Applied to charges">{formatMoney(bd.appliedToCharges ?? 0)}</Row>
                    <Row label="Applied to principal">{formatMoney(bd.appliedToPrincipal ?? 0)}</Row>
                    <Row label="Surplus for the borrower">{formatMoney(bd.surplus ?? 0)}</Row>
                    {bd.unrecoveredTotal && Number(bd.unrecoveredTotal) > 0 && (
                      <Row label="Left owing at the sale (shortfall)">
                        <span className="text-rose-600">{formatMoney(bd.unrecoveredTotal)}</span>
                      </Row>
                    )}
                    {bd.surplusPaidOut && (
                      <Row label="Surplus paid out">
                        {formatMoney(bd.surplusPaidOut.amount)} · {bd.surplusPaidOut.mode.replace(/_/g, ' ').toLowerCase()}
                        {bd.surplusPaidOut.reference ? ` · ${bd.surplusPaidOut.reference}` : ''}
                      </Row>
                    )}
                  </dl>
                </div>
              )}
            </section>
          )}

          {a.postings.length > 0 && (
            <section className="card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Ledger entries</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                    <th className="py-2 pr-4">What</th>
                    <th className="py-2 pr-4">Debit</th>
                    <th className="py-2 pr-4">Credit</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gold-100">
                  {a.postings.map((p) => (
                    <tr key={p.id}>
                      <td className="py-2.5 pr-4 text-ink">{p.type === 'REFUND' ? ACCOUNT_LABEL.CASH : (ACCOUNT_LABEL[p.creditAccount] ?? p.type)}</td>
                      <td className="py-2.5 pr-4 text-ink-light">{p.debitAccount.replace(/_/g, ' ').toLowerCase()}</td>
                      <td className="py-2.5 pr-4 text-ink-light">{p.creditAccount.replace(/_/g, ' ').toLowerCase()}</td>
                      <td className="py-2.5 text-right text-ink">{formatMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">The loan</h2>
            <dl className="mt-2">
              <Row label="Status">
                <StatusBadge status={a.loan.status} />
              </Row>
              <Row label="Principal">{formatMoney(a.loan.principalAmount)}</Row>
              <Row label="Matured">{a.loan.maturityDate ? formatDate(a.loan.maturityDate) : '—'}</Row>
              <Row label="Days past due">{a.daysPastDue}</Row>
              {a.outstanding && (
                <>
                  <Row label="Owing now">
                    <span className="text-rose-600">{formatMoney(a.outstanding.total)}</span>
                  </Row>
                  <p className="pb-1 text-right text-xs text-ink-light/70">
                    {formatMoney(a.outstanding.principal)} principal · {formatMoney(a.outstanding.interest)} interest · {formatMoney(a.outstanding.charges)} charges
                  </p>
                </>
              )}
            </dl>
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Pledged gold</h2>
            {a.collaterals.length === 0 && <p className="mt-2 text-sm text-ink-light">None on record.</p>}
            {a.collaterals.map((c) => (
              <div key={c.id} className="mt-3">
                <p className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  {c.collateralCode} <StatusBadge status={c.status} />
                </p>
                <ul className="mt-1.5 space-y-1 text-sm text-ink">
                  {c.items.map((i) => (
                    <li key={i.id} className="flex justify-between">
                      <span>{i.itemType.toLowerCase()}</span>
                      <span className="text-ink-light">
                        {Number(i.netWeight)} g · {Number(i.purityKarat)}k
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Valuation</h2>
            {a.reservePrice ? (
              <dl className="mt-2">
                <Row label="Gold rate">{a.goldRatePerGram ? `${formatMoney(a.goldRatePerGram)}/g` : '—'}</Row>
                <Row label="Market value">{a.marketValue ? formatMoney(a.marketValue) : '—'}</Row>
                <Row label={`Reserve price (${Number(a.reservePricePercent)}%)`}>{formatMoney(a.reservePrice)}</Row>
                {a.reserveCoversOutstanding !== null && (
                  <p className={`pt-1 text-right text-xs ${a.reserveCoversOutstanding ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {a.reserveCoversOutstanding ? 'Reserve price covers what is owed.' : 'Reserve price is below what is owed — a shortfall is likely.'}
                  </p>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink-light">Not valued yet.</p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Notice &amp; dates</h2>
            {a.notices.length === 0 && !a.scheduledDate ? (
              <p className="mt-2 text-sm text-ink-light">No notice sent yet.</p>
            ) : (
              <dl className="mt-2">
                {a.notices.length > 0 && <Row label="Notice sent via">{Array.from(new Set(a.notices.map((n) => n.channel))).join(', ')}</Row>}
                {a.noticeSentAt && <Row label="Notice sent">{formatDate(a.noticeSentAt)}</Row>}
                {a.noticePeriodEndsAt && <Row label={`Notice period ends (${a.noticePeriodDays} days)`}>{formatDate(a.noticePeriodEndsAt)}</Row>}
                {a.approvedAt && <Row label="Approved">{formatDate(a.approvedAt)}</Row>}
                {a.scheduledDate && <Row label="Auction date">{formatDate(a.scheduledDate)}</Row>}
                {a.venue && <Row label="Venue">{a.venue}</Row>}
              </dl>
            )}
            {noticeLive && (
              <a href={`/dashboard/documents/auction-notice/${a.id}`} target="_blank" rel="noopener" className="btn-secondary mt-4 w-full gap-1.5 whitespace-nowrap text-xs">
                <FileText size={14} /> Borrower notice (PDF)
              </a>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Who did what</h2>
            <dl className="mt-2">
              <Row label="Put forward by">{a.people.createdBy ?? '—'}</Row>
              <Row label="Valued by">{a.people.preparedBy ?? '—'}</Row>
              <Row label="Approved by">{a.people.approvedBy ?? '—'}</Row>
              <Row label="Sale recorded by">{a.people.saleRecordedBy ?? '—'}</Row>
              <Row label="Surplus paid by">{a.people.settledBy ?? '—'}</Row>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
