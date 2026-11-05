import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { addDays } from '../../common/utils/interest';
import { daysPastDue } from '../../common/utils/collections';
import { AGING_BUCKETS, AgingBucketKey, agingBucket, percentOf, toCsv } from '../../common/utils/reports';
import { OPEN_AUCTION_STATUSES, noticePeriodElapsed } from '../../common/utils/auction';
import { LoansService } from '../loans/loans.service';

const { Decimal } = Prisma;
type Dec = Prisma.Decimal;

const OPEN_STATUSES = ['ACTIVE', 'OVERDUE'] as const;
const COLLECTED_TYPES = ['INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'FEE'] as const;
const todayUtc = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const monthStartUtc = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const money = (d: Dec) => d.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);

interface OpenLoanRow {
  branchId: string;
  outstanding: Dec; // principal still owed
  dpd: number; // days past (maturity + grace); 0 or less = current
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly loans: LoansService,
  ) {}

  /**
   * Which branches a caller may report on. Cross-branch roles see everything
   * (or one branch if they ask); everyone else is pinned to their own branch
   * and a request for another branch is refused, not silently narrowed.
   */
  private scope(user: JwtPayloadUser, requestedBranchId?: string): { branchIds: string[] | null } {
    if (requestedBranchId) {
      this.branchScope.assertAccess(user, requestedBranchId);
      return { branchIds: [requestedBranchId] };
    }
    if (this.branchScope.isCrossBranch(user)) return { branchIds: null };
    return { branchIds: user.branchId ? [user.branchId] : [] };
  }

  /** Every ACTIVE/OVERDUE loan with its outstanding principal and days past due, in one pass. */
  private async openLoanRows(branchIds: string[] | null, now = new Date()): Promise<OpenLoanRow[]> {
    const branchWhere = branchIds ? { branchId: { in: branchIds } } : {};
    const [loans, paid] = await Promise.all([
      this.prisma.loan.findMany({
        where: { status: { in: [...OPEN_STATUSES] }, ...branchWhere },
        select: { id: true, branchId: true, principalAmount: true, maturityDate: true, product: { select: { gracePeriodDays: true } } },
      }),
      this.prisma.financialTransaction.groupBy({
        by: ['loanId'],
        where: { type: 'PRINCIPAL_PAYMENT', loan: { status: { in: [...OPEN_STATUSES] }, ...branchWhere } },
        _sum: { amount: true },
      }),
    ]);
    const paidBy = new Map(paid.map((p) => [p.loanId, new Decimal(p._sum.amount ?? 0)]));
    return loans.map((l) => ({
      branchId: l.branchId,
      outstanding: Decimal.max(new Decimal(l.principalAmount).minus(paidBy.get(l.id) ?? 0), 0),
      dpd: daysPastDue(l.maturityDate, l.product.gracePeriodDays, now),
    }));
  }

  /** Money moved since `from`, grouped by ledger transaction type (and branch when asked). */
  private async movements(branchIds: string[] | null, from: Date) {
    return this.prisma.financialTransaction.groupBy({
      by: ['type', 'branchId'],
      where: {
        createdAt: { gte: from },
        type: { in: ['DISBURSEMENT', ...COLLECTED_TYPES] },
        ...(branchIds ? { branchId: { in: branchIds } } : {}),
      },
      _sum: { amount: true },
      _count: { _all: true },
    });
  }

  // =====================================================================
  // PORTFOLIO
  // =====================================================================

  async portfolio(user: JwtPayloadUser, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const now = new Date();
    const [rows, moves] = await Promise.all([this.openLoanRows(branchIds, now), this.movements(branchIds, monthStartUtc(now))]);

    const sum = (list: OpenLoanRow[]) => list.reduce((s, r) => s.plus(r.outstanding), new Decimal(0));
    const overdue = rows.filter((r) => r.dpd >= 1);
    const totalOutstanding = sum(rows);
    const overdueOutstanding = sum(overdue);

    const by = (type: string) => moves.filter((m) => m.type === type);
    const total = (list: typeof moves) => list.reduce((s, m) => s.plus(m._sum.amount ?? 0), new Decimal(0));
    const collected = {
      principal: total(by('PRINCIPAL_PAYMENT')),
      interest: total(by('INTEREST_PAYMENT')),
      charges: total(by('FEE')),
    };
    const disbursements = by('DISBURSEMENT');

    return {
      asOf: now.toISOString(),
      openLoans: { count: rows.length, principalOutstanding: money(totalOutstanding) },
      current: { count: rows.length - overdue.length, principalOutstanding: money(totalOutstanding.minus(overdueOutstanding)) },
      overdue: { count: overdue.length, principalOutstanding: money(overdueOutstanding) },
      // Portfolio at risk: the share of outstanding principal that is past due.
      portfolioAtRiskPercent: percentOf(overdueOutstanding, totalOutstanding),
      thisMonth: {
        from: iso(monthStartUtc(now)),
        disbursed: { count: disbursements.reduce((n, m) => n + m._count._all, 0), amount: money(total(disbursements)) },
        collected: {
          total: money(collected.principal.plus(collected.interest).plus(collected.charges)),
          principal: money(collected.principal),
          interest: money(collected.interest),
          charges: money(collected.charges),
        },
      },
    };
  }

  // =====================================================================
  // OVERDUE AGING
  // =====================================================================

  async aging(user: JwtPayloadUser, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const rows = await this.openLoanRows(branchIds);
    const total = rows.reduce((s, r) => s.plus(r.outstanding), new Decimal(0));
    const acc = new Map<AgingBucketKey, { count: number; principal: Dec }>(AGING_BUCKETS.map((b) => [b.key, { count: 0, principal: new Decimal(0) }]));
    for (const r of rows) {
      const b = acc.get(agingBucket(r.dpd))!;
      b.count += 1;
      b.principal = b.principal.plus(r.outstanding);
    }
    return {
      asOf: new Date().toISOString(),
      totalOutstanding: money(total),
      buckets: AGING_BUCKETS.map((b) => {
        const a = acc.get(b.key)!;
        return { key: b.key, label: b.label, count: a.count, principalOutstanding: money(a.principal), percentOfPortfolio: percentOf(a.principal, total) };
      }),
    };
  }

  // =====================================================================
  // BRANCHES
  // =====================================================================

  async branches(user: JwtPayloadUser, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const now = new Date();
    const [branchList, rows, moves] = await Promise.all([
      this.prisma.branch.findMany({
        where: { ...(branchIds ? { id: { in: branchIds } } : {}), status: 'ACTIVE' },
        select: { id: true, code: true, name: true },
        orderBy: { code: 'asc' },
      }),
      this.openLoanRows(branchIds, now),
      this.movements(branchIds, monthStartUtc(now)),
    ]);

    const items = branchList.map((b) => {
      const mine = rows.filter((r) => r.branchId === b.id);
      const overdue = mine.filter((r) => r.dpd >= 1);
      const outstanding = mine.reduce((s, r) => s.plus(r.outstanding), new Decimal(0));
      const overdueOutstanding = overdue.reduce((s, r) => s.plus(r.outstanding), new Decimal(0));
      const sumType = (types: readonly string[]) => moves.filter((m) => m.branchId === b.id && types.includes(m.type)).reduce((s, m) => s.plus(m._sum.amount ?? 0), new Decimal(0));
      return {
        branchId: b.id,
        code: b.code,
        name: b.name,
        openLoans: mine.length,
        principalOutstanding: money(outstanding),
        overdueLoans: overdue.length,
        overduePrincipal: money(overdueOutstanding),
        portfolioAtRiskPercent: percentOf(overdueOutstanding, outstanding),
        disbursedThisMonth: money(sumType(['DISBURSEMENT'])),
        collectedThisMonth: money(sumType(COLLECTED_TYPES)),
      };
    });

    const add = (k: 'principalOutstanding' | 'overduePrincipal' | 'disbursedThisMonth' | 'collectedThisMonth') => items.reduce((s, i) => s.plus(i[k]), new Decimal(0));
    const totals = {
      openLoans: items.reduce((n, i) => n + i.openLoans, 0),
      principalOutstanding: money(add('principalOutstanding')),
      overdueLoans: items.reduce((n, i) => n + i.overdueLoans, 0),
      overduePrincipal: money(add('overduePrincipal')),
      portfolioAtRiskPercent: percentOf(add('overduePrincipal'), add('principalOutstanding')),
      disbursedThisMonth: money(add('disbursedThisMonth')),
      collectedThisMonth: money(add('collectedThisMonth')),
    };
    return { asOf: now.toISOString(), items, totals };
  }

  // =====================================================================
  // TREND — disbursed vs collected, one row per UTC calendar day
  // =====================================================================

  async trend(user: JwtPayloadUser, days: number, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const today = todayUtc();
    const from = addDays(today, -(days - 1));
    const branchSql = branchIds ? (branchIds.length ? Prisma.sql`AND branch_id IN (${Prisma.join(branchIds.map((b) => Prisma.sql`${b}::uuid`))})` : Prisma.sql`AND FALSE`) : Prisma.empty;
    // created_at is `timestamp without time zone` holding UTC, so ::date is already the UTC calendar day.
    const rows = await this.prisma.$queryRaw<Array<{ day: Date; kind: string; amount: Dec }>>(Prisma.sql`
      SELECT created_at::date AS day,
             CASE WHEN type = 'DISBURSEMENT' THEN 'disbursed' ELSE 'collected' END AS kind,
             SUM(amount) AS amount
        FROM financial_transactions
       WHERE created_at >= ${from}
         AND type IN ('DISBURSEMENT', 'INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'FEE')
         ${branchSql}
       GROUP BY 1, 2`);
    const byDay = new Map<string, { disbursed: Dec; collected: Dec }>();
    for (let i = 0; i < days; i++) byDay.set(iso(addDays(from, i)), { disbursed: new Decimal(0), collected: new Decimal(0) });
    for (const r of rows) {
      const slot = byDay.get(iso(new Date(r.day)));
      if (slot) slot[r.kind as 'disbursed' | 'collected'] = new Decimal(r.amount);
    }
    const series = [...byDay.entries()].map(([date, v]) => ({ date, disbursed: money(v.disbursed), collected: money(v.collected) }));
    return {
      from: iso(from),
      to: iso(today),
      days,
      totals: {
        disbursed: money(series.reduce((s, p) => s.plus(p.disbursed), new Decimal(0))),
        collected: money(series.reduce((s, p) => s.plus(p.collected), new Decimal(0))),
      },
      series,
    };
  }

  // =====================================================================
  // COLLECTIONS PERFORMANCE
  // =====================================================================

  async collections(user: JwtPayloadUser, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const branch = branchIds ? { branchId: { in: branchIds } } : {};
    const since = addDays(todayUtc(), -30);
    const [open, unassigned, opened30, closed30, promiseGroups, byOfficer] = await Promise.all([
      this.prisma.collectionCase.count({ where: { ...branch, status: 'OPEN' } }),
      this.prisma.collectionCase.count({ where: { ...branch, status: 'OPEN', assignedTo: null } }),
      this.prisma.collectionCase.count({ where: { ...branch, openedAt: { gte: since } } }),
      this.prisma.collectionCase.count({ where: { ...branch, status: 'CLOSED', closedAt: { gte: since } } }),
      this.prisma.promiseToPay.groupBy({
        by: ['status'],
        where: { case: branch, OR: [{ resolvedAt: { gte: since } }, { status: 'PENDING' }] },
        _count: { _all: true },
      }),
      this.prisma.collectionCase.groupBy({ by: ['assignedTo'], where: { ...branch, status: 'OPEN', assignedTo: { not: null } }, _count: { _all: true } }),
    ]);
    const count = (s: string) => promiseGroups.find((g) => g.status === s)?._count._all ?? 0;
    const kept = count('KEPT');
    const broken = count('BROKEN');
    const employees = byOfficer.length
      ? await this.prisma.employee.findMany({ where: { id: { in: byOfficer.map((o) => o.assignedTo!) } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    return {
      asOf: new Date().toISOString(),
      windowDays: 30,
      cases: { open, unassigned, openedLast30Days: opened30, closedLast30Days: closed30 },
      promises: { kept, broken, pending: count('PENDING'), keepRatePercent: percentOf(kept, kept + broken) },
      byOfficer: byOfficer
        .map((o) => {
          const e = employees.find((x) => x.id === o.assignedTo);
          return { employeeId: o.assignedTo!, name: e ? [e.firstName, e.lastName].filter(Boolean).join(' ') : 'Unknown', openCases: o._count._all };
        })
        .sort((a, b) => b.openCases - a.openCases),
    };
  }

  // =====================================================================
  // AUCTIONS
  // =====================================================================

  /** The figures the sale itself recorded (strings, to the paisa), read back as Decimals. */
  private saleFigures(breakdown: unknown) {
    const b = (breakdown ?? {}) as Record<string, string | undefined>;
    const d = (k: string) => new Decimal(b[k] ?? 0);
    return {
      interest: d('appliedToInterest'),
      charges: d('appliedToCharges'),
      principal: d('appliedToPrincipal'),
      surplus: d('surplus'),
      shortfall: d('unrecoveredTotal'),
    };
  }

  async auctions(user: JwtPayloadUser, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const inBranch: Prisma.AuctionWhereInput = branchIds ? { loan: { branchId: { in: branchIds } } } : {};
    const now = new Date();
    const windowDays = 90;
    const since = addDays(todayUtc(now), -windowDays);
    const shortfallSince = addDays(todayUtc(now), -365);

    const [open, sold, cancelled, awaitingPayout, soldForShortfalls] = await Promise.all([
      this.prisma.auction.findMany({
        where: { ...inBranch, status: { in: [...OPEN_AUCTION_STATUSES] } },
        select: { id: true, auctionNumber: true, status: true, noticePeriodEndsAt: true, scheduledDate: true },
      }),
      this.prisma.auction.findMany({
        where: { ...inBranch, status: { in: ['COMPLETED', 'SETTLED'] }, completedAt: { gte: since } },
        select: { loanId: true, salePrice: true, saleBreakdown: true },
      }),
      this.prisma.auction.count({ where: { ...inBranch, status: 'CANCELLED', cancelledAt: { gte: since } } }),
      this.prisma.auction.aggregate({ where: { ...inBranch, status: 'COMPLETED' }, _sum: { surplusAmount: true }, _count: { _all: true } }),
      this.prisma.auction.findMany({
        where: { ...inBranch, status: { in: ['COMPLETED', 'SETTLED'] }, completedAt: { gte: shortfallSince } },
        select: {
          id: true,
          loanId: true,
          auctionNumber: true,
          completedAt: true,
          saleBreakdown: true,
          loan: { select: { loanNumber: true, branch: { select: { code: true, name: true } }, customer: { select: { firstName: true, lastName: true, customerCode: true } } } },
        },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const a of open) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    const readyForApproval = open.filter((a) => a.status === 'NOTICE_SENT' && a.noticePeriodEndsAt && noticePeriodElapsed(a.noticePeriodEndsAt, now)).length;
    const upcoming = open
      .filter((a) => a.status === 'SCHEDULED' && a.scheduledDate)
      .sort((a, b) => a.scheduledDate!.getTime() - b.scheduledDate!.getTime())
      .slice(0, 5)
      .map((a) => ({ id: a.id, auctionNumber: a.auctionNumber, scheduledDate: iso(a.scheduledDate!) }));

    let salePrice = new Decimal(0);
    let interest = new Decimal(0);
    let charges = new Decimal(0);
    let principal = new Decimal(0);
    let surplus = new Decimal(0);
    let shortfall = new Decimal(0);
    for (const a of sold) {
      const f = this.saleFigures(a.saleBreakdown);
      salePrice = salePrice.plus(a.salePrice ?? 0);
      interest = interest.plus(f.interest);
      charges = charges.plus(f.charges);
      principal = principal.plus(f.principal);
      surplus = surplus.plus(f.surplus);
      shortfall = shortfall.plus(f.shortfall);
    }

    // Sales that did not cover what was owed. What matters for follow-up is what is STILL owed: money recovered
    // since, or written off, no longer needs chasing — so the balance is read from the ledger, not from the sale.
    const remainingByLoan = new Map<string, Dec>();
    const stillOwed = async (loanId: string) => {
      if (!remainingByLoan.has(loanId)) remainingByLoan.set(loanId, Decimal.max((await this.loans.getOutstandingBreakdown(loanId)).total, new Decimal(0)));
      return remainingByLoan.get(loanId)!;
    };
    let shortfallRemaining = new Decimal(0);
    for (const a of sold) {
      if (this.saleFigures(a.saleBreakdown).shortfall.gt(0)) shortfallRemaining = shortfallRemaining.plus(await stillOwed(a.loanId));
    }
    const withShortfall = soldForShortfalls.map((a) => ({ a, f: this.saleFigures(a.saleBreakdown) })).filter((x) => x.f.shortfall.gt(0)).slice(0, 100);
    const shortfalls = (await Promise.all(withShortfall.map(async ({ a, f }) => ({ a, f, remaining: await stillOwed(a.loanId) }))))
      .filter((x) => x.remaining.gt(0.01))
      .sort((x, y) => y.remaining.comparedTo(x.remaining))
      .slice(0, 20)
      .map(({ a, f, remaining }) => ({
        auctionId: a.id,
        auctionNumber: a.auctionNumber,
        loanNumber: a.loan.loanNumber,
        branch: a.loan.branch,
        customer: `${a.loan.customer.firstName} ${a.loan.customer.lastName ?? ''}`.trim(),
        customerCode: a.loan.customer.customerCode,
        soldOn: a.completedAt ? iso(a.completedAt) : null,
        shortfallAtSale: money(f.shortfall),
        shortfall: money(remaining),
      }));

    return {
      asOf: now.toISOString(),
      windowDays,
      pipeline: { open: open.length, byStatus, readyForApproval, upcoming },
      outcomes: {
        sold: sold.length,
        cancelled,
        salePrice: money(salePrice),
        recovered: { interest: money(interest), charges: money(charges), principal: money(principal), total: money(interest.plus(charges).plus(principal)) },
        surplusToBorrowers: money(surplus),
        shortfall: money(shortfall),
        shortfallRemaining: money(shortfallRemaining),
      },
      surplusAwaitingPayout: { auctions: awaitingPayout._count._all, amount: money(new Decimal(awaitingPayout._sum.surplusAmount ?? 0)) },
      shortfalls,
    };
  }

  // =====================================================================
  // CSV EXPORTS
  // =====================================================================

  async auctionsCsv(user: JwtPayloadUser, branchId?: string) {
    const { branchIds } = this.scope(user, branchId);
    const since = addDays(todayUtc(), -90);
    const rows = await this.prisma.auction.findMany({
      where: { ...(branchIds ? { loan: { branchId: { in: branchIds } } } : {}), status: { in: ['COMPLETED', 'SETTLED'] }, completedAt: { gte: since } },
      orderBy: { completedAt: 'desc' },
      select: { loanId: true, auctionNumber: true, status: true, completedAt: true, salePrice: true, saleBreakdown: true, loan: { select: { loanNumber: true, branch: { select: { code: true } } } } },
    });
    const out: (string | number)[][] = [];
    for (const r of rows) {
      const f = this.saleFigures(r.saleBreakdown);
      const now = f.shortfall.gt(0) ? Decimal.max((await this.loans.getOutstandingBreakdown(r.loanId)).total, new Decimal(0)) : new Decimal(0);
      out.push([r.auctionNumber, r.loan.loanNumber, r.loan.branch.code, r.completedAt ? iso(r.completedAt) : '', r.status, money(new Decimal(r.salePrice ?? 0)), money(f.interest), money(f.charges), money(f.principal), money(f.surplus), money(f.shortfall), money(now)]);
    }
    return toCsv(
      ['Auction', 'Loan', 'Branch', 'Sold on (UTC)', 'Status', 'Sale price (INR)', 'To interest (INR)', 'To charges (INR)', 'To principal (INR)', 'Surplus to borrower (INR)', 'Shortfall at sale (INR)', 'Still owed now (INR)'],
      out,
    );
  }

  async agingCsv(user: JwtPayloadUser, branchId?: string) {
    const r = await this.aging(user, branchId);
    return toCsv(['Bucket', 'Loans', 'Outstanding principal (INR)', '% of portfolio'], r.buckets.map((b) => [b.label, b.count, b.principalOutstanding, b.percentOfPortfolio]));
  }

  async branchesCsv(user: JwtPayloadUser, branchId?: string) {
    const r = await this.branches(user, branchId);
    const row = (i: (typeof r.items)[number] | (typeof r)['totals'], code: string, name: string) => [
      code, name, i.openLoans, i.principalOutstanding, i.overdueLoans, i.overduePrincipal, i.portfolioAtRiskPercent, i.disbursedThisMonth, i.collectedThisMonth,
    ];
    return toCsv(
      ['Branch code', 'Branch', 'Open loans', 'Outstanding principal (INR)', 'Overdue loans', 'Overdue principal (INR)', 'PAR %', 'Disbursed this month (INR)', 'Collected this month (INR)'],
      [...r.items.map((i) => row(i, i.code, i.name)), row(r.totals, '', 'TOTAL')],
    );
  }

  async trendCsv(user: JwtPayloadUser, days: number, branchId?: string) {
    const r = await this.trend(user, days, branchId);
    return toCsv(['Date (UTC)', 'Disbursed (INR)', 'Collected (INR)'], r.series.map((p) => [p.date, p.disbursed, p.collected]));
  }
}
