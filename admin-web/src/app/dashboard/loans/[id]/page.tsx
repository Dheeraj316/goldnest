import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Download, FileText, Gavel } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Loan } from '@/lib/types';
import { formatDate, formatDateTime } from '@/lib/format';
import { CollateralForm } from './CollateralForm';
import { AppraisalForm } from './AppraisalForm';
import { DecideAppraisalButtons } from './DecideAppraisalButtons';
import { ApprovalActions } from './ApprovalActions';
import { DisburseButton } from './DisburseButton';
import { PaymentForm } from './PaymentForm';
import { CloseLoanButton } from './CloseLoanButton';
import { RenewForm } from './RenewForm';
import { TopUpForm } from './TopUpForm';
import { PartReleaseForm } from './PartReleaseForm';

export const metadata: Metadata = { title: 'Loan Detail' };

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [loan, user] = await Promise.all([apiFetch<Loan>(`/loans/${id}`), getCurrentUser()]);
  const canRenew = hasPermission(user, 'loan.renew');
  const canTopUp = hasPermission(user, 'loan.topup');
  const canPartRelease = hasPermission(user, 'loan.partrelease');
  const canSeeAuctions = hasPermission(user, 'auction.view');
  const openAuction = (loan.auctions ?? []).find((a) => !['COMPLETED', 'SETTLED', 'CANCELLED'].includes(a.status));
  const soldAuction = (loan.auctions ?? []).find((a) => ['COMPLETED', 'SETTLED'].includes(a.status));
  const pledgedItems = (loan.collaterals ?? []).flatMap((c) =>
    c.items.map((i) => ({ id: i.id, itemType: i.itemType, netWeight: Number(i.netWeight), purityKarat: Number(i.purityKarat) })),
  );
  const movements = (loan.collaterals ?? []).flatMap((c) => c.movements ?? []);
  const collateral = loan.collaterals?.[0];
  const pendingAppraisal = collateral?.appraisals?.find((a) => a.status === 'PENDING_CHECK');
  const approvedAppraisal = collateral?.appraisals?.find((a) => a.status === 'APPROVED');

  return (
    <div>
      <Link href="/dashboard/loans" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700">
        <ArrowLeft size={14} /> Back to loans
      </Link>
      <PageHeader
        title={loan.loanNumber}
        description={`${loan.customer?.firstName ?? ''} ${loan.customer?.lastName ?? ''} — ${loan.product?.name ?? ''}`}
        action={<StatusBadge status={loan.status} />}
      />

      {(openAuction || soldAuction) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm text-ink" role="note">
          <Gavel size={16} className="shrink-0 text-rose-600" />
          <span>
            {openAuction ? (
              <>
                An auction is in progress on this loan (<strong>{openAuction.auctionNumber}</strong>, {openAuction.status.replace(/_/g, ' ').toLowerCase()}). The gold cannot be renewed, topped up or released while it runs; the
                borrower can still pay and close the loan to redeem it.
              </>
            ) : (
              <>
                The pledged gold on this loan was sold at auction (<strong>{soldAuction?.auctionNumber}</strong>).
              </>
            )}
          </span>
          {canSeeAuctions && (
            <Link href={`/dashboard/auctions/${(openAuction ?? soldAuction)?.id}`} className="ml-auto whitespace-nowrap font-medium text-gold-700 hover:underline">
              View auction →
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary */}
        <div className="card p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-ink">Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-light">Principal</dt><dd className="font-medium text-ink">₹{Number(loan.principalAmount).toLocaleString('en-IN')}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">LTV</dt><dd className="font-medium text-ink">{loan.approvedLtvPercent}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Rate</dt><dd className="font-medium text-ink">{loan.interestRateSnapshot}% p.a.</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Tenure</dt><dd className="font-medium text-ink">{loan.tenureDays} days</dd></div>
            {loan.startDate && <div className="flex justify-between"><dt className="text-ink-light">Start</dt><dd className="font-medium text-ink">{formatDate(loan.startDate)}</dd></div>}
            {loan.maturityDate && <div className="flex justify-between"><dt className="text-ink-light">Maturity</dt><dd className="font-medium text-ink">{formatDate(loan.maturityDate)}</dd></div>}
            {loan.closedAt && <div className="flex justify-between"><dt className="text-ink-light">Closed</dt><dd className="font-medium text-ink">{formatDateTime(loan.closedAt)}</dd></div>}
          </dl>

          {loan.outstanding && (
            <div className="mt-5 rounded-lg border border-gold-200 bg-gold-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Outstanding</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-light">Principal</dt><dd>₹{Number(loan.outstanding.principal).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-light">Interest</dt><dd>₹{Number(loan.outstanding.interest).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-light">Charges</dt><dd>₹{Number(loan.outstanding.charges).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between border-t border-gold-200 pt-1.5 font-semibold text-ink"><dt>Total</dt><dd>₹{Number(loan.outstanding.total).toLocaleString('en-IN')}</dd></div>
              </dl>
            </div>
          )}

          {loan.status === 'APPROVED' && <div className="mt-4"><DisburseButton loanId={loan.id} /></div>}
          {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && Number(loan.outstanding?.total ?? 1) <= 0.01 && (
            <div className="mt-4"><CloseLoanButton loanId={loan.id} /></div>
          )}
        </div>

        {/* Collateral & appraisal */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink">Collateral & appraisal</h2>
          {!collateral && loan.status === 'APPRAISAL_PENDING' && <CollateralForm loanId={loan.id} />}
          {collateral && (
            <div className="mt-4 space-y-4">
              <div className="rounded-lg border border-gold-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/70">{collateral.collateralCode}</p>
                <StatusBadge status={collateral.status} />
                <table className="mt-3 w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-light/70">
                      <th className="py-1 pr-3">Item</th>
                      <th className="py-1 pr-3">Gross</th>
                      <th className="py-1 pr-3">Net</th>
                      <th className="py-1 pr-3">Purity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {collateral.items.map((i) => (
                      <tr key={i.id}>
                        <td className="py-1 pr-3">{i.itemType}</td>
                        <td className="py-1 pr-3">{i.grossWeight}g</td>
                        <td className="py-1 pr-3">{i.netWeight}g</td>
                        <td className="py-1 pr-3">{i.purityKarat}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {movements.length > 0 && (
                <div className="rounded-lg border border-gold-100 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/70">Collateral movements</p>
                  <ul className="mt-2 space-y-2 text-sm">
                    {movements.map((m) => (
                      <li key={m.id} className="flex justify-between gap-4">
                        <span className="text-ink-light">{m.reason}</span>
                        <span className="shrink-0 text-xs text-ink-light/60">{formatDateTime(m.occurredAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {collateral.status === 'PENDING_APPRAISAL' && !pendingAppraisal && (
                <AppraisalForm loanId={loan.id} collateralId={collateral.id} items={collateral.items} />
              )}

              {collateral.appraisals?.map((a) => (
                <div key={a.id} className="rounded-lg border border-gold-100 p-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={a.status} />
                    <span className="text-xs text-ink-light/60">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between"><dt className="text-ink-light">Gold rate</dt><dd>₹{a.goldRatePerGram}/g</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-light">Total valuation</dt><dd className="font-medium">₹{Number(a.totalValuation).toLocaleString('en-IN')}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-light">Eligible amount</dt><dd className="font-medium">₹{Number(a.eligibleLoanValue).toLocaleString('en-IN')}</dd></div>
                  </dl>
                  {a.id === pendingAppraisal?.id && <DecideAppraisalButtons loanId={loan.id} appraisalId={a.id} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approvals */}
        {approvedAppraisal && (
          <div className="card p-6 lg:col-span-3">
            <h2 className="font-display text-lg font-semibold text-ink">Approval</h2>
            <div className="mt-4 space-y-3">
              {(loan.approvals ?? []).map((a) => (
                <div key={a.id} className="flex items-center justify-between border-b border-gold-100 pb-2.5 text-sm last:border-0">
                  <div>
                    <StatusBadge status={a.decision} />
                    {a.approvedAmount && <span className="ml-2 text-ink-light">₹{Number(a.approvedAmount).toLocaleString('en-IN')}</span>}
                    {a.remarks && <p className="mt-1 text-xs text-ink-light/70">{a.remarks}</p>}
                  </div>
                  <span className="text-xs text-ink-light/60">{formatDateTime(a.decidedAt)}</span>
                </div>
              ))}
              {loan.status === 'APPROVAL_PENDING' && <ApprovalActions loanId={loan.id} />}
            </div>
          </div>
        )}

        {/* Payments & ledger */}
        {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE' || loan.status === 'CLOSED' || loan.status === 'AUCTIONED') && (
          <div className="card p-6 lg:col-span-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Payments</h2>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <a
                  href={`/dashboard/documents/statement/${loan.id}`}
                  target="_blank"
                  rel="noopener"
                  className="btn-secondary gap-1.5 whitespace-nowrap text-xs"
                >
                  <FileText size={15} /> Statement (PDF)
                </a>
                {(loan.status === 'ACTIVE' || loan.status === 'OVERDUE') && (
                  <>
                  {canRenew && loan.outstanding && (
                    <RenewForm
                      loanId={loan.id}
                      interestOutstanding={Number(loan.outstanding.interest)}
                      chargesOutstanding={Number(loan.outstanding.charges)}
                      tenureDays={loan.tenureDays}
                    />
                  )}
                  {canTopUp && loan.outstanding && pledgedItems.length > 0 && (
                    <TopUpForm
                      loanId={loan.id}
                      ltvPercent={Number(loan.approvedLtvPercent)}
                      outstandingPrincipal={Number(loan.outstanding.principal)}
                      items={pledgedItems}
                    />
                  )}
                  {canPartRelease && loan.outstanding && pledgedItems.length >= 2 && (
                    <PartReleaseForm
                      loanId={loan.id}
                      ltvPercent={Number(loan.approvedLtvPercent)}
                      outstandingPrincipal={Number(loan.outstanding.principal)}
                      items={pledgedItems}
                    />
                  )}
                  <PaymentForm loanId={loan.id} />
                  </>
                )}
                {loan.status === 'AUCTIONED' && Number(loan.outstanding?.total ?? 0) > 0.01 && <PaymentForm loanId={loan.id} />}
              </div>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="py-2 pr-4">Receipt</th>
                  <th className="py-2 pr-4">Principal</th>
                  <th className="py-2 pr-4">Interest</th>
                  <th className="py-2 pr-4">Charges</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {(loan.receipts ?? []).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-4 font-medium text-ink">{r.receiptNumber}</td>
                    <td className="py-2.5 pr-4 text-ink-light">₹{Number(r.principalComponent).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4 text-ink-light">₹{Number(r.interestComponent).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4 text-ink-light">₹{Number(r.chargesComponent).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4 font-medium text-ink">₹{Number(r.totalAmount).toLocaleString('en-IN')}</td>
                    <td className="py-2.5 pr-4 text-ink-light">{formatDateTime(r.createdAt)}</td>
                    <td className="py-2.5 text-right">
                      <a
                        href={`/dashboard/documents/receipt/${r.id}`}
                        target="_blank"
                        rel="noopener"
                        aria-label={`Download receipt ${r.receiptNumber}`}
                        className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-gold-600 hover:text-gold-700"
                      >
                        <Download size={13} /> Receipt
                      </a>
                    </td>
                  </tr>
                ))}
                {(loan.receipts ?? []).length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-ink-light/60">No payments recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Ledger */}
        <div className="card p-6 lg:col-span-3">
          <h2 className="font-display text-lg font-semibold text-ink">Ledger</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Amount</th>
                <th className="py-2 pr-4">Debit</th>
                <th className="py-2 pr-4">Credit</th>
                <th className="py-2 pr-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {(loan.financialTransactions ?? []).map((t) => (
                <tr key={t.id}>
                  <td className="py-2.5 pr-4 font-medium text-ink">{t.type.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 pr-4 text-ink-light">₹{Number(t.amount).toLocaleString('en-IN')}</td>
                  <td className="py-2.5 pr-4 text-ink-light">{t.debitAccount}</td>
                  <td className="py-2.5 pr-4 text-ink-light">{t.creditAccount}</td>
                  <td className="py-2.5 pr-4 text-ink-light">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
              {(loan.financialTransactions ?? []).length === 0 && (
                <tr><td colSpan={5} className="py-6 text-center text-ink-light/60">No ledger entries yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
