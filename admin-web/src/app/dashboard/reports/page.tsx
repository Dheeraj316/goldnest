import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, BarChart3, Download, HandCoins, Landmark, Percent, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { apiFetch } from '@/lib/api-server';
import { formatDate, formatDateTime, formatMoney, formatMoneyCompact } from '@/lib/format';
import type { AgingReport, AuctionsReport, Branch, BranchesReport, CollectionsReport, PortfolioReport, TrendReport } from '@/lib/types';
import { TrendChart } from './TrendChart';

export const metadata: Metadata = { title: 'Reports' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_OPTIONS = [30, 60, 90] as const;

// Aging bar colour ramps from calm (current) to alarming (90+ days).
const BUCKET_TONE: Record<string, string> = {
  CURRENT: 'bg-emerald-500',
  DPD_1_30: 'bg-gold-400',
  DPD_31_60: 'bg-orange-500',
  DPD_61_90: 'bg-rose-500',
  DPD_90_PLUS: 'bg-rose-700',
};

function parTone(percent: string) {
  const p = Number(percent);
  if (p >= 10) return 'text-rose-600';
  if (p >= 5) return 'text-orange-600';
  return 'text-emerald-600';
}

function ExportLink({ report, query, label = 'Export CSV' }: { report: string; query: string; label?: string }) {
  return (
    <a href={`/dashboard/reports/export/${report}${query ? `?${query}` : ''}`} className="btn-secondary inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap !px-3 !py-1.5 text-xs" download>
      <Download size={13} /> {label}
    </a>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ branchId?: string; days?: string }> }) {
  const sp = await searchParams;
  const branchId = sp.branchId && UUID.test(sp.branchId) ? sp.branchId : undefined;
  const days = DAY_OPTIONS.find((d) => String(d) === sp.days) ?? 30;
  const q = branchId ? `?branchId=${branchId}` : '';
  const qs = branchId ? `branchId=${branchId}` : '';

  const [portfolio, aging, branches, trend, collections, auctions, branchList] = await Promise.all([
    apiFetch<PortfolioReport>(`/reports/portfolio${q}`),
    apiFetch<AgingReport>(`/reports/aging${q}`),
    apiFetch<BranchesReport>(`/reports/branches${q}`),
    apiFetch<TrendReport>(`/reports/trend?days=${days}${branchId ? `&branchId=${branchId}` : ''}`),
    apiFetch<CollectionsReport>(`/reports/collections${q}`),
    apiFetch<AuctionsReport>(`/reports/auctions${q}`),
    apiFetch<Branch[]>('/branches/active'),
  ]);

  const scopeLabel = branchId ? (branchList.find((b) => b.id === branchId)?.name ?? 'Selected branch') : 'All branches you can see';
  const maxBucket = Math.max(1, ...aging.buckets.map((b) => Number(b.principalOutstanding)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description={`Portfolio health as of ${formatDateTime(portfolio.asOf)} · ${scopeLabel}`}
        action={
          branchList.length > 1 ? (
            <form method="get" className="flex items-center gap-2">
              <label htmlFor="branchId" className="text-xs font-medium text-ink-light">Branch</label>
              <select id="branchId" name="branchId" defaultValue={branchId ?? ''} className="input !w-auto !py-1.5 text-sm">
                <option value="">All branches</option>
                {branchList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
              <input type="hidden" name="days" value={days} />
              <button type="submit" className="btn-primary !px-3 !py-1.5 text-sm">Apply</button>
            </form>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Open loans" value={portfolio.openLoans.count} icon={Landmark} hint={`${portfolio.current.count} current · ${portfolio.overdue.count} overdue`} />
        <StatCard label="Outstanding principal" value={formatMoneyCompact(portfolio.openLoans.principalOutstanding)} icon={Wallet} hint={formatMoney(portfolio.openLoans.principalOutstanding)} />
        <StatCard label="Overdue principal" value={formatMoneyCompact(portfolio.overdue.principalOutstanding)} icon={AlertTriangle} hint={`${portfolio.overdue.count} loan${portfolio.overdue.count === 1 ? '' : 's'} past maturity + grace`} />
        <StatCard label="Portfolio at risk" value={`${portfolio.portfolioAtRiskPercent}%`} icon={Percent} hint="Overdue principal ÷ outstanding principal" />
        <StatCard label="Disbursed this month" value={formatMoneyCompact(portfolio.thisMonth.disbursed.amount)} icon={HandCoins} hint={`${portfolio.thisMonth.disbursed.count} disbursement${portfolio.thisMonth.disbursed.count === 1 ? '' : 's'} since ${portfolio.thisMonth.from}`} />
        <StatCard
          label="Collected this month"
          value={formatMoneyCompact(portfolio.thisMonth.collected.total)}
          icon={BarChart3}
          hint={`Principal ${formatMoneyCompact(portfolio.thisMonth.collected.principal)} · interest ${formatMoneyCompact(portfolio.thisMonth.collected.interest)} · fees ${formatMoneyCompact(portfolio.thisMonth.collected.charges)}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-ink">Overdue aging</h2>
              <p className="text-xs text-ink-light">Days past maturity plus the product&apos;s grace period — the same rule that opens a collection case.</p>
            </div>
            <ExportLink report="aging" query={qs} />
          </div>
          <div className="space-y-3">
            {aging.buckets.map((b) => (
              <div key={b.key}>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="font-medium text-ink">{b.label}</span>
                  <span className="text-ink-light">
                    {b.count} loan{b.count === 1 ? '' : 's'} · <span className="font-medium text-ink">{formatMoney(b.principalOutstanding)}</span> · {b.percentOfPortfolio}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gold-50">
                  <div className={`h-full rounded-full ${BUCKET_TONE[b.key] ?? 'bg-gold-400'}`} style={{ width: `${(Number(b.principalOutstanding) / maxBucket) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <div className="mb-4">
            <h2 className="font-display text-lg font-semibold text-ink">Collections performance</h2>
            <p className="text-xs text-ink-light">Cases and promises to pay, last {collections.windowDays} days.</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              ['Open cases', collections.cases.open],
              ['Unassigned', collections.cases.unassigned],
              ['Opened (30d)', collections.cases.openedLast30Days],
              ['Closed (30d)', collections.cases.closedLast30Days],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-gold-50/60 p-3">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-light/70">{label}</dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-gold-100 p-3 text-sm">
            <span>Promises kept <b className="text-emerald-600">{collections.promises.kept}</b></span>
            <span>Broken <b className="text-rose-600">{collections.promises.broken}</b></span>
            <span>Pending <b className="text-ink">{collections.promises.pending}</b></span>
            <span className="ml-auto text-ink-light">Keep rate <b className="text-ink">{collections.promises.keepRatePercent}%</b></span>
          </div>
          <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-light/70">Open cases by officer</h3>
          {collections.byOfficer.length === 0 ? (
            <p className="text-sm text-ink-light/60">No open case is assigned to an officer.</p>
          ) : (
            <ul className="divide-y divide-gold-100 text-sm">
              {collections.byOfficer.map((o) => (
                <li key={o.employeeId} className="flex justify-between py-2">
                  <span>{o.name}</span>
                  <span className="font-medium text-ink">{o.openCases}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mb-6 p-6" aria-label="Auctions">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Auctions</h2>
            <p className="text-xs text-ink-light">
              Loans whose gold went to auction. Sold and auctioned loans leave the open portfolio above, so they are reported here instead. Last {auctions.windowDays} days.
            </p>
          </div>
          <ExportLink report="auctions" query={qs} />
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['In progress', String(auctions.pipeline.open), ''],
            ['Ready for approval', String(auctions.pipeline.readyForApproval), 'notice period over'],
            ['Sold', String(auctions.outcomes.sold), `${auctions.outcomes.cancelled} cancelled`],
            ['Recovered', formatMoney(auctions.outcomes.recovered.total), 'interest, charges, principal'],
            ['Surplus to pay out', formatMoney(auctions.surplusAwaitingPayout.amount), `${auctions.surplusAwaitingPayout.auctions} auction${auctions.surplusAwaitingPayout.auctions === 1 ? '' : 's'}`],
            ['Shortfall still owed', formatMoney(auctions.outcomes.shortfallRemaining), `${formatMoney(auctions.outcomes.shortfall)} at sale`],
          ].map(([label, value, note]) => (
            <div key={label} className="rounded-xl bg-gold-50/60 p-3">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-light/70">{label}</dt>
              <dd className="mt-1 font-display text-xl font-semibold text-ink">{value}</dd>
              {note && <p className="text-[11px] text-ink-light/70">{note}</p>}
            </div>
          ))}
        </dl>

        {auctions.pipeline.upcoming.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-light/70">Coming up</h3>
            <ul className="divide-y divide-gold-100 text-sm">
              {auctions.pipeline.upcoming.map((u) => (
                <li key={u.id} className="flex justify-between py-2">
                  <Link href={`/dashboard/auctions/${u.id}`} className="font-medium text-ink hover:text-gold-700">
                    {u.auctionNumber}
                  </Link>
                  <span className="text-ink-light">{formatDate(u.scheduledDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-ink-light/70">Shortfalls still to recover (sales in the last 12 months)</h3>
        {auctions.shortfalls.length === 0 ? (
          <p className="text-sm text-ink-light/60">No sale has left money owing.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="py-2 pr-4">Auction</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Branch</th>
                  <th className="py-2 pr-4">Sold on</th>
                  <th className="py-2 pr-4 text-right">At sale</th>
                  <th className="py-2 text-right">Still owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {auctions.shortfalls.map((r) => (
                  <tr key={r.auctionId}>
                    <td className="py-2.5 pr-4">
                      <Link href={`/dashboard/auctions/${r.auctionId}`} className="font-medium text-ink hover:text-gold-700">
                        {r.auctionNumber}
                      </Link>
                      <p className="text-xs text-ink-light/70">{r.loanNumber}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-light">
                      {r.customer}
                      <p className="text-xs text-ink-light/70">{r.customerCode}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-ink-light">{r.branch.code}</td>
                    <td className="py-2.5 pr-4 text-ink-light">{r.soldOn ? formatDate(r.soldOn) : '—'}</td>
                    <td className="py-2.5 pr-4 text-right text-ink-light">{formatMoney(r.shortfallAtSale)}</td>
                    <td className="py-2.5 text-right font-medium text-rose-600">{formatMoney(r.shortfall)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Branches</h2>
            <p className="text-xs text-ink-light">Open portfolio and this month&apos;s money movement, branch by branch.</p>
          </div>
          <ExportLink report="branches" query={qs} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                <th className="px-5 py-3">Branch</th>
                <th className="px-5 py-3 text-right">Open loans</th>
                <th className="px-5 py-3 text-right">Outstanding</th>
                <th className="px-5 py-3 text-right">Overdue</th>
                <th className="px-5 py-3 text-right">PAR</th>
                <th className="px-5 py-3 text-right">Disbursed (month)</th>
                <th className="px-5 py-3 text-right">Collected (month)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {branches.items.map((b) => (
                <tr key={b.branchId}>
                  <td className="px-5 py-3"><span className="font-medium text-ink">{b.name}</span> <span className="text-xs text-ink-light">{b.code}</span></td>
                  <td className="px-5 py-3 text-right">{b.openLoans}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(b.principalOutstanding)}</td>
                  <td className="px-5 py-3 text-right">{b.overdueLoans} · {formatMoney(b.overduePrincipal)}</td>
                  <td className={`px-5 py-3 text-right font-semibold ${parTone(b.portfolioAtRiskPercent)}`}>{b.portfolioAtRiskPercent}%</td>
                  <td className="px-5 py-3 text-right">{formatMoney(b.disbursedThisMonth)}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(b.collectedThisMonth)}</td>
                </tr>
              ))}
              {branches.items.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-light/60">No active branch in scope.</td></tr>
              )}
            </tbody>
            {branches.items.length > 1 && (
              <tfoot>
                <tr className="border-t-2 border-gold-100 bg-gold-50/40 font-semibold text-ink">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right">{branches.totals.openLoans}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(branches.totals.principalOutstanding)}</td>
                  <td className="px-5 py-3 text-right">{branches.totals.overdueLoans} · {formatMoney(branches.totals.overduePrincipal)}</td>
                  <td className={`px-5 py-3 text-right ${parTone(branches.totals.portfolioAtRiskPercent)}`}>{branches.totals.portfolioAtRiskPercent}%</td>
                  <td className="px-5 py-3 text-right">{formatMoney(branches.totals.disbursedThisMonth)}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(branches.totals.collectedThisMonth)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <section className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">Disbursed vs collected</h2>
            <p className="text-xs text-ink-light">
              {trend.from} to {trend.to} (UTC days) · disbursed {formatMoney(trend.totals.disbursed)} · collected {formatMoney(trend.totals.collected)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border border-gold-200 text-xs">
              {DAY_OPTIONS.map((d) => (
                <a
                  key={d}
                  href={`/dashboard/reports?days=${d}${branchId ? `&branchId=${branchId}` : ''}`}
                  className={`px-3 py-1.5 font-medium ${d === days ? 'bg-gold-500 text-white' : 'bg-white text-ink-light hover:bg-gold-50'}`}
                >
                  {d} days
                </a>
              ))}
            </div>
            <ExportLink report="trend" query={`days=${days}${branchId ? `&branchId=${branchId}` : ''}`} />
          </div>
        </div>
        <TrendChart series={trend.series} />
      </section>
    </div>
  );
}
