import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import { InterestEngineService } from '../interest-engine/interest-engine.service';
import { LoansService } from '../loans/loans.service';
import { addDays } from '../../common/utils/interest';
import { LEDGER, ledgerPaid } from '../../common/utils/loan-balance';
import { daysPastDue } from '../../common/utils/collections';
import {
  auctionIneligibility,
  BidError,
  marketValueOf,
  noticePeriodElapsed,
  noticePeriodEnd,
  OPEN_AUCTION_STATUSES,
  pickWinningBid,
  reservePriceOf,
  settleSale,
  utcDay,
} from '../../common/utils/auction';
import { CancelAuctionDto, CreateAuctionDto, PrepareAuctionDto, QueryAuctionsDto, RecordSaleDto, ScheduleAuctionDto, SendNoticeDto, SettleAuctionDto, WriteOffDto } from './dto/auctions.dto';

const { Decimal } = Prisma;
type Tx = Prisma.TransactionClient;

// Regulatory / commercial parameters live in Configuration (maker-checker), never in code. These are only
// the fallbacks used until an approved value exists — PLACEHOLDERS: the real minimum overdue period, notice
// period and reserve-price percentage must come from the lender's compliance sign-off before production.
export const AUCTION_CONFIG_KEYS = {
  minOverdueDays: 'AUCTION_MIN_OVERDUE_DAYS',
  noticePeriodDays: 'AUCTION_NOTICE_PERIOD_DAYS',
  reservePricePercent: 'AUCTION_RESERVE_PRICE_PERCENT',
} as const;
export const AUCTION_CONFIG_DEFAULTS = { minOverdueDays: 30, noticePeriodDays: 15, reservePricePercent: 85 } as const;

export interface AuctionConfig {
  minOverdueDays: number;
  noticePeriodDays: number;
  reservePricePercent: number;
  /** Which parameters are still on the built-in placeholder because no approved value exists. */
  usingDefaults: string[];
}

const money = (d: Prisma.Decimal) => d.toFixed(2);
const fullName = (p: { firstName: string; lastName: string | null } | null | undefined) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : null);

@Injectable()
export class AuctionsService {
  private readonly logger = new Logger(AuctionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly numberGenerator: NumberGeneratorService,
    private readonly interestEngine: InterestEngineService,
    private readonly loansService: LoansService,
  ) {}

  // =====================================================================
  // helpers
  // =====================================================================

  private employeeId(actor: JwtPayloadUser): string {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    return actor.employeeId;
  }

  private conflict(message: string): never {
    throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, message);
  }

  private invalid(message: string): never {
    throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
  }

  async getConfig(): Promise<AuctionConfig> {
    const keys = Object.values(AUCTION_CONFIG_KEYS);
    // Only approved (ACTIVE) values count — a value still awaiting approval is a proposal, not policy.
    const rows = await this.prisma.setting.findMany({ where: { key: { in: keys }, scope: 'GLOBAL', status: 'ACTIVE' } });
    const usingDefaults: string[] = [];
    const read = (key: string, fallback: number, valid: (n: number) => boolean): number => {
      const row = rows.find((r) => r.key === key);
      const n = row ? Number(row.value) : NaN;
      if (row && Number.isFinite(n) && valid(n)) return n;
      if (row) this.logger.warn(`Setting ${key} has an unusable value (${JSON.stringify(row.value)}); using the placeholder ${fallback}.`);
      usingDefaults.push(key);
      return fallback;
    };
    return {
      minOverdueDays: read(AUCTION_CONFIG_KEYS.minOverdueDays, AUCTION_CONFIG_DEFAULTS.minOverdueDays, (n) => Number.isInteger(n) && n >= 0 && n <= 3650),
      noticePeriodDays: read(AUCTION_CONFIG_KEYS.noticePeriodDays, AUCTION_CONFIG_DEFAULTS.noticePeriodDays, (n) => Number.isInteger(n) && n >= 0 && n <= 365),
      reservePricePercent: read(AUCTION_CONFIG_KEYS.reservePricePercent, AUCTION_CONFIG_DEFAULTS.reservePricePercent, (n) => n > 0 && n <= 100),
      usingDefaults,
    };
  }

  /** Locks are always taken loan first, then auction, so two actions on the same loan cannot deadlock. */
  private async lockLoan(tx: Tx, loanId: string) {
    await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId}::uuid FOR UPDATE`;
  }
  private async lockAuction(tx: Tx, id: string) {
    await tx.$queryRaw`SELECT id FROM auctions WHERE id = ${id}::uuid FOR UPDATE`;
  }

  /** What the borrower owes right now, read inside the transaction (after the loan row is locked). */
  private async outstandingIn(tx: Tx, loanId: string) {
    const loan = await tx.loan.findUniqueOrThrow({ where: { id: loanId }, select: { principalAmount: true } });
    const paid = await ledgerPaid(tx, loanId);
    const accrued = await tx.interestAccrual.aggregate({ where: { loanId }, _sum: { interestAmount: true } });
    const charges = await tx.loanCharge.aggregate({ where: { loanId, waived: false }, _sum: { amount: true } });
    const zero = new Decimal(0);
    const principal = Decimal.max(new Decimal(loan.principalAmount).minus(paid.principal), zero);
    const interest = Decimal.max(new Decimal(accrued._sum.interestAmount ?? 0).minus(paid.interest), zero);
    const chargesOut = Decimal.max(new Decimal(charges._sum.amount ?? 0).minus(paid.charges), zero);
    return { principal, interest, charges: chargesOut, total: principal.plus(interest).plus(chargesOut) };
  }

  private async loadAuction(id: string) {
    const auction = await this.prisma.auction.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            customer: { select: { firstName: true, lastName: true, mobile: true, customerCode: true } },
            branch: { select: { id: true, code: true, name: true } },
            product: { select: { name: true, gracePeriodDays: true } },
          },
        },
        notices: { orderBy: { sentAt: 'asc' } },
        bids: { orderBy: { bidAmount: 'desc' } },
      },
    });
    if (!auction) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    return auction;
  }

  private async loadForAction(id: string, actor: JwtPayloadUser) {
    const auction = await this.loadAuction(id);
    this.branchScope.assertAccess(actor, auction.loan.branchId);
    return auction;
  }

  // =====================================================================
  // READS
  // =====================================================================

  async list(query: QueryAuctionsDto, user: JwtPayloadUser) {
    const where: Prisma.AuctionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.open === 'true' ? { status: { in: [...OPEN_AUCTION_STATUSES] } } : {}),
      ...(query.open === 'false' ? { status: { notIn: [...OPEN_AUCTION_STATUSES] } } : {}),
      ...(this.branchScope.isCrossBranch(user) ? {} : { loan: { branchId: user.branchId } }),
    };
    const [rows, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          loan: {
            select: {
              id: true,
              loanNumber: true,
              principalAmount: true,
              maturityDate: true,
              status: true,
              branch: { select: { code: true, name: true } },
              customer: { select: { firstName: true, lastName: true, customerCode: true } },
              product: { select: { gracePeriodDays: true } },
            },
          },
        },
      }),
      this.prisma.auction.count({ where }),
    ]);
    const now = new Date();
    const items = rows.map((a) => ({
      id: a.id,
      auctionNumber: a.auctionNumber,
      status: a.status,
      createdAt: a.createdAt,
      scheduledDate: a.scheduledDate,
      noticePeriodEndsAt: a.noticePeriodEndsAt,
      reservePrice: a.reservePrice,
      salePrice: a.salePrice,
      surplusAmount: a.surplusAmount,
      daysPastDue: daysPastDue(a.loan.maturityDate, a.loan.product.gracePeriodDays, now),
      loan: { id: a.loan.id, loanNumber: a.loan.loanNumber, principalAmount: a.loan.principalAmount, status: a.loan.status, branch: a.loan.branch },
      customer: a.loan.customer,
    }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  /** Overdue loans that have reached the minimum overdue period and have no auction in progress. */
  async candidates(user: JwtPayloadUser) {
    const config = await this.getConfig();
    const loans = await this.prisma.loan.findMany({
      where: {
        status: 'OVERDUE',
        auctions: { none: { status: { in: [...OPEN_AUCTION_STATUSES] } } },
        collaterals: { some: { status: { in: ['APPRAISED', 'STORED'] }, items: { some: { releasedAt: null } } } },
        ...(this.branchScope.isCrossBranch(user) ? {} : { branchId: user.branchId }),
      },
      orderBy: { maturityDate: 'asc' },
      take: 500,
      select: {
        id: true,
        loanNumber: true,
        principalAmount: true,
        maturityDate: true,
        branch: { select: { code: true, name: true } },
        customer: { select: { firstName: true, lastName: true, customerCode: true } },
        product: { select: { gracePeriodDays: true } },
      },
    });
    const now = new Date();
    const items = loans
      .map((l) => ({
        loanId: l.id,
        loanNumber: l.loanNumber,
        principalAmount: l.principalAmount,
        maturityDate: l.maturityDate,
        branch: l.branch,
        customer: l.customer,
        daysPastDue: daysPastDue(l.maturityDate, l.product.gracePeriodDays, now),
      }))
      .filter((l) => l.daysPastDue >= config.minOverdueDays)
      .sort((a, b) => b.daysPastDue - a.daysPastDue);
    return { minOverdueDays: config.minOverdueDays, items };
  }

  async getConfigForDisplay() {
    return this.getConfig();
  }

  async detail(id: string, user: JwtPayloadUser) {
    const a = await this.loadForAction(id, user);
    const config = await this.getConfig();
    const now = new Date();

    // Live figures only while the loan is still open; afterwards the sale record is the truth.
    let outstanding: { principal: string; interest: string; charges: string; total: string } | null = null;
    if (a.loan.status === 'OVERDUE') {
      await this.interestEngine.accrueUpToToday(a.loanId);
      const b = await this.loansService.getOutstandingBreakdown(a.loanId);
      outstanding = { principal: money(b.principal), interest: money(b.interest), charges: money(b.charges), total: money(b.total) };
    }

    const collaterals = await this.prisma.collateral.findMany({
      where: { loanId: a.loanId },
      select: {
        id: true,
        collateralCode: true,
        status: true,
        items: { where: { releasedAt: null }, select: { id: true, itemType: true, netWeight: true, purityKarat: true } },
      },
    });
    const postings = await this.prisma.financialTransaction.findMany({
      where: { loanId: a.loanId, reference: a.auctionNumber },
      orderBy: { createdAt: 'asc' },
      select: { id: true, type: true, amount: true, debitAccount: true, creditAccount: true, createdAt: true },
    });

    const writtenOff = (a.saleBreakdown as { writtenOff?: { by?: string; total?: string } } | null)?.writtenOff;
    const personIds = [a.createdBy, a.preparedBy, a.approvedBy, a.saleRecordedBy, a.settledBy, a.cancelledBy, writtenOff?.by].filter((x): x is string => !!x);
    const people = personIds.length
      ? await this.prisma.employee.findMany({ where: { id: { in: personIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const nameOf = (eid: string | null) => fullName(people.find((p) => p.id === eid));

    // After a sale that did not cover the debt: what was left, what has since been recovered, what was written
    // off, and what is still owed (read from the ledger, the same figure the loan page shows).
    let shortfall: { atSale: string; recovered: string; writtenOff: string; remaining: string } | null = null;
    if (['COMPLETED', 'SETTLED'].includes(a.status)) {
      const bd = (a.saleBreakdown ?? {}) as { unrecoveredTotal?: string; writtenOff?: { total?: string } };
      const atSale = new Decimal(bd.unrecoveredTotal ?? 0);
      if (atSale.gt(0)) {
        const remaining = Decimal.max((await this.loansService.getOutstandingBreakdown(a.loanId)).total, new Decimal(0));
        const off = new Decimal(bd.writtenOff?.total ?? 0);
        shortfall = { atSale: money(atSale), recovered: money(Decimal.max(atSale.minus(remaining).minus(off), new Decimal(0))), writtenOff: money(off), remaining: money(remaining) };
      }
    }

    const { loan, ...rest } = a;
    const reserve = a.reservePrice ? new Decimal(a.reservePrice) : null;
    return {
      ...rest,
      loan: {
        id: loan.id,
        loanNumber: loan.loanNumber,
        status: loan.status,
        principalAmount: loan.principalAmount,
        interestRateSnapshot: loan.interestRateSnapshot,
        startDate: loan.startDate,
        maturityDate: loan.maturityDate,
        branch: loan.branch,
        product: loan.product,
      },
      customer: loan.customer,
      daysPastDue: daysPastDue(loan.maturityDate, loan.product.gracePeriodDays, now),
      outstanding,
      reserveCoversOutstanding: reserve && outstanding ? reserve.gte(outstanding.total) : null,
      shortfall,
      collaterals,
      postings,
      people: {
        createdBy: nameOf(a.createdBy),
        preparedBy: nameOf(a.preparedBy),
        approvedBy: nameOf(a.approvedBy),
        saleRecordedBy: nameOf(a.saleRecordedBy),
        settledBy: nameOf(a.settledBy),
        cancelledBy: nameOf(a.cancelledBy),
        writtenOffBy: nameOf(writtenOff?.by ?? null),
      },
      config,
    };
  }

  // =====================================================================
  // WORKFLOW
  // =====================================================================

  /** 1. Puts an overdue loan forward as an auction candidate. */
  async create(dto: CreateAuctionDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const loan = await this.prisma.loan.findUnique({ where: { id: dto.loanId }, include: { product: { select: { gracePeriodDays: true } } } });
    if (!loan) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Loan not found.');
    this.branchScope.assertAccess(actor, loan.branchId);

    const config = await this.getConfig();
    await this.interestEngine.accrueUpToToday(loan.id);
    const outstanding = await this.loansService.getOutstandingBreakdown(loan.id);
    const now = new Date();
    const dpd = daysPastDue(loan.maturityDate, loan.product.gracePeriodDays, now);
    const [openCount, goldCount] = await Promise.all([
      this.prisma.auction.count({ where: { loanId: loan.id, status: { in: [...OPEN_AUCTION_STATUSES] } } }),
      this.prisma.collateral.count({ where: { loanId: loan.id, status: { in: ['APPRAISED', 'STORED'] }, items: { some: { releasedAt: null } } } }),
    ]);
    const reasons = auctionIneligibility({
      loanStatus: loan.status,
      daysPastDue: dpd,
      minOverdueDays: config.minOverdueDays,
      hasOpenAuction: openCount > 0,
      hasPledgedGold: goldCount > 0,
      outstandingTotal: outstanding.total,
    });
    if (reasons.length > 0) this.conflict(reasons.join(' '));

    const auctionNumber = await this.numberGenerator.generateAuctionNumber();
    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockLoan(tx, loan.id);
        // Re-check under the lock: the database's one-open-auction-per-loan index is the final word, this
        // just gives the normal case a clear message.
        const open = await tx.auction.findFirst({ where: { loanId: loan.id, status: { in: [...OPEN_AUCTION_STATUSES] } }, select: { id: true } });
        if (open) this.conflict('This loan already has an auction in progress.');
        const fresh = await tx.loan.findUniqueOrThrow({ where: { id: loan.id }, select: { status: true } });
        if (fresh.status !== 'OVERDUE') this.conflict(`The loan is ${fresh.status}; only an overdue loan can go to auction.`);
        return tx.auction.create({ data: { auctionNumber, loanId: loan.id, status: 'CANDIDATE', createdBy: employeeId, daysPastDueAtCreation: dpd } });
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') this.conflict('This loan already has an auction in progress.');
      throw e;
    }
  }

  /** 2. Values the pledged gold at today's rate and sets the reserve price. Can be redone until notice goes out. */
  async prepare(id: string, dto: PrepareAuctionDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (!['CANDIDATE', 'UNDER_REVIEW'].includes(auction.status)) {
      this.conflict(`Auction is ${auction.status}; the reserve price can only be set before the notice goes out.`);
    }
    const config = await this.getConfig();

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoan(tx, auction.loanId);
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (!['CANDIDATE', 'UNDER_REVIEW'].includes(current.status)) this.conflict(`Auction is ${current.status}; the reserve price can only be set before the notice goes out.`);

      const items = await tx.collateralItem.findMany({
        where: { releasedAt: null, collateral: { loanId: auction.loanId, status: { in: ['APPRAISED', 'STORED'] } } },
        select: { netWeight: true, purityKarat: true },
      });
      if (items.length === 0) this.conflict('There is no pledged gold on this loan to value.');

      const rate = new Decimal(dto.goldRatePerGram);
      const marketValue = marketValueOf(items, rate);
      const reserve = reservePriceOf(marketValue, config.reservePricePercent);
      return tx.auction.update({
        where: { id },
        data: {
          status: 'UNDER_REVIEW',
          preparedBy: employeeId,
          goldRatePerGram: rate,
          marketValue,
          reservePricePercent: new Decimal(config.reservePricePercent),
          reservePrice: reserve,
        },
      });
    });
  }

  /** 3. Records that the borrower has been given notice. The first notice starts the notice period. */
  async sendNotice(id: string, dto: SendNoticeDto, actor: JwtPayloadUser) {
    this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (!['UNDER_REVIEW', 'NOTICE_SENT'].includes(auction.status)) {
      this.conflict(auction.status === 'CANDIDATE' ? 'Set the reserve price before sending notice.' : `Auction is ${auction.status}; notice can no longer be sent.`);
    }
    const config = await this.getConfig();

    return this.prisma.$transaction(async (tx) => {
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id } });
      if (!['UNDER_REVIEW', 'NOTICE_SENT'].includes(current.status)) this.conflict(`Auction is ${current.status}; notice can no longer be sent.`);
      const now = new Date();
      await tx.auctionNotice.createMany({ data: dto.channels.map((channel) => ({ auctionId: id, channel, sentAt: now })) });
      if (current.status === 'UNDER_REVIEW') {
        // The period is fixed by the FIRST notice; further channels (say, a posted copy) never restart it.
        return tx.auction.update({
          where: { id },
          data: { status: 'NOTICE_SENT', noticeSentAt: now, noticePeriodDays: config.noticePeriodDays, noticePeriodEndsAt: noticePeriodEnd(now, config.noticePeriodDays) },
          include: { notices: true },
        });
      }
      return tx.auction.findUniqueOrThrow({ where: { id }, include: { notices: true } });
    });
  }

  /** 4. Second-person approval, only once the notice period is over and the loan is still unpaid. */
  async approve(id: string, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (auction.status !== 'NOTICE_SENT') this.conflict(`Auction is ${auction.status}; it can only be approved once notice has been sent.`);
    // Maker-checker: whoever put the loan forward or set the reserve price cannot also approve the sale.
    if (employeeId === auction.createdBy || employeeId === auction.preparedBy) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN, 'The person who prepared this auction cannot also approve it.');
    }
    if (!auction.noticePeriodEndsAt || !noticePeriodElapsed(auction.noticePeriodEndsAt, new Date())) {
      this.conflict(`The notice period has not ended yet — it ends on ${auction.noticePeriodEndsAt ? auction.noticePeriodEndsAt.toISOString().slice(0, 10) : 'an unknown date'}.`);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoan(tx, auction.loanId);
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (current.status !== 'NOTICE_SENT') this.conflict(`Auction is ${current.status}; it can only be approved once notice has been sent.`);
      const loan = await tx.loan.findUniqueOrThrow({ where: { id: auction.loanId }, select: { status: true } });
      if (loan.status !== 'OVERDUE') this.conflict(`The loan is ${loan.status}; only an overdue loan can be auctioned. Cancel this auction.`);
      const owed = await this.outstandingIn(tx, auction.loanId);
      if (owed.total.lte(0.01)) this.conflict('Nothing is owing on this loan any more. Cancel this auction and close the loan.');

      // From here the gold is earmarked for sale — it can no longer be part-released, topped up or renewed.
      const moved = await tx.collateral.updateMany({ where: { loanId: auction.loanId, status: { in: ['APPRAISED', 'STORED'] } }, data: { status: 'AUCTION_PROCESS' } });
      if (moved.count === 0) this.conflict('There is no pledged gold on this loan to auction.');
      return tx.auction.update({ where: { id }, data: { status: 'APPROVED', approvedBy: employeeId, approvedAt: new Date() } });
    });
  }

  /** 5. Fixes the auction date (and can move it while it has not happened yet). */
  async schedule(id: string, dto: ScheduleAuctionDto, actor: JwtPayloadUser) {
    this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (!['APPROVED', 'SCHEDULED'].includes(auction.status)) this.conflict(`Auction is ${auction.status}; it can only be scheduled once approved.`);

    const date = new Date(`${dto.scheduledDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== dto.scheduledDate) this.invalid('scheduledDate is not a real calendar date.');
    const today = utcDay(new Date());
    if (date < today) this.invalid('The auction date cannot be in the past.');
    if (date > addDays(today, 365)) this.invalid('The auction date is more than a year away.');

    return this.prisma.$transaction(async (tx) => {
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (!['APPROVED', 'SCHEDULED'].includes(current.status)) this.conflict(`Auction is ${current.status}; it can only be scheduled once approved.`);
      return tx.auction.update({ where: { id }, data: { status: 'SCHEDULED', scheduledDate: date, venue: dto.venue?.trim() || null } });
    });
  }

  /**
   * 6. Records the sale: the bids received, the winner (highest, never below the reserve price), and how the
   *    money is applied — interest, charges, then principal, with any excess held as the borrower's surplus.
   *    Everything happens in one transaction with the loan locked, so a payment arriving at the same moment
   *    is either counted or refused, never half-counted.
   */
  async recordSale(id: string, dto: RecordSaleDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (auction.status !== 'SCHEDULED') this.conflict(`Auction is ${auction.status}; a sale can only be recorded for a scheduled auction.`);
    if (!auction.scheduledDate || utcDay(auction.scheduledDate) > utcDay(new Date())) {
      this.conflict(`The auction is scheduled for ${auction.scheduledDate ? auction.scheduledDate.toISOString().slice(0, 10) : 'a later date'}; the sale cannot be recorded before then.`);
    }
    if (!auction.reservePrice) this.conflict('This auction has no reserve price.');

    let winner: { index: number; amount: Prisma.Decimal };
    try {
      winner = pickWinningBid(dto.bids);
    } catch (e) {
      if (e instanceof BidError) this.invalid(e.message);
      throw e;
    }
    if (winner.amount.lt(auction.reservePrice)) {
      this.invalid(`The highest bid (₹${money(winner.amount)}) is below the reserve price (₹${money(new Decimal(auction.reservePrice))}). The gold cannot be sold — reschedule or cancel the auction.`);
    }

    await this.interestEngine.accrueUpToToday(auction.loanId);

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoan(tx, auction.loanId);
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (current.status !== 'SCHEDULED') this.conflict(`Auction is ${current.status}; a sale can only be recorded for a scheduled auction.`);
      const loan = await tx.loan.findUniqueOrThrow({ where: { id: auction.loanId } });
      if (loan.status !== 'OVERDUE') this.conflict(`The loan is ${loan.status}; the sale cannot proceed. Cancel this auction.`);

      const owed = await this.outstandingIn(tx, loan.id);
      if (owed.total.lte(0.01)) this.conflict('Nothing is owing on this loan any more. Cancel this auction and close the loan.');
      const s = settleSale({ salePrice: winner.amount, interestOutstanding: owed.interest, chargesOutstanding: owed.charges, principalOutstanding: owed.principal });

      const legs: { part: string; type: 'AUCTION_PROCEEDS'; amount: Prisma.Decimal; creditAccount: string }[] = [
        { part: 'INTEREST', type: 'AUCTION_PROCEEDS', amount: s.toInterest, creditAccount: 'INTEREST_INCOME' },
        { part: 'CHARGES', type: 'AUCTION_PROCEEDS', amount: s.toCharges, creditAccount: 'FEE_INCOME' },
        { part: 'PRINCIPAL', type: 'AUCTION_PROCEEDS', amount: s.toPrincipal, creditAccount: 'LOAN_PRINCIPAL_RECEIVABLE' },
        // The borrower's money, held until it is paid back — a liability, never income.
        { part: 'SURPLUS', type: 'AUCTION_PROCEEDS', amount: s.surplus, creditAccount: 'CUSTOMER_SURPLUS_PAYABLE' },
      ];
      for (const leg of legs) {
        await this.loansService.postFinancialLeg(tx, {
          loanId: loan.id,
          customerId: loan.customerId,
          branchId: loan.branchId,
          type: leg.type,
          amount: leg.amount,
          debitAccount: 'CASH',
          creditAccount: leg.creditAccount,
          reference: auction.auctionNumber,
          idempotencyKey: `AUCTION-${id}-${leg.part}`,
          createdBy: employeeId,
        });
      }

      await tx.auctionBid.createMany({
        data: dto.bids.map((b, i) => ({ auctionId: id, bidderName: b.bidderName.trim(), bidAmount: new Decimal(b.bidAmount), isWinning: i === winner.index })),
      });

      const now = new Date();
      const sold = await tx.collateral.findMany({ where: { loanId: loan.id, status: 'AUCTION_PROCESS' }, select: { id: true } });
      for (const c of sold) {
        await tx.collateral.update({ where: { id: c.id }, data: { status: 'AUCTIONED' } });
        await tx.collateralMovement.create({
          data: {
            collateralId: c.id,
            employeeId,
            fromLocation: 'VAULT',
            toLocation: 'AUCTION_BUYER',
            reason: `Sold at auction ${auction.auctionNumber}`,
            authorizedBy: auction.approvedBy,
            occurredAt: now,
          },
        });
      }

      await tx.loan.update({ where: { id: loan.id }, data: { status: 'AUCTIONED' } });
      await tx.loanApplication.update({ where: { id: loan.applicationId }, data: { status: 'AUCTIONED' } });
      await tx.loanStatusHistory.create({
        data: { loanId: loan.id, fromStatus: 'OVERDUE', toStatus: 'AUCTIONED', changedBy: employeeId, reason: `Gold sold at auction ${auction.auctionNumber} for ₹${money(winner.amount)}` },
      });
      // The collection case has nothing left to chase.
      const cases = await tx.collectionCase.findMany({ where: { loanId: loan.id, status: 'OPEN' }, select: { id: true } });
      for (const c of cases) {
        await tx.collectionCase.update({ where: { id: c.id }, data: { status: 'CLOSED', closedAt: now, closeReason: `Gold auctioned (${auction.auctionNumber})` } });
        await tx.promiseToPay.updateMany({ where: { caseId: c.id, status: 'PENDING' }, data: { status: 'CANCELLED', resolvedAt: now } });
        await tx.collectionActivity.create({ data: { caseId: c.id, type: 'SYSTEM', notes: `Case closed: gold auctioned (${auction.auctionNumber}).` } });
      }

      const unrecovered = s.unrecoveredPrincipal.plus(s.unrecoveredInterest).plus(s.unrecoveredCharges);
      const hasSurplus = s.surplus.gt(0);
      return tx.auction.update({
        where: { id },
        data: {
          // Nothing to hand back to the borrower means there is nothing left to settle.
          status: hasSurplus ? 'COMPLETED' : 'SETTLED',
          salePrice: winner.amount,
          surplusAmount: s.surplus,
          buyerName: dto.bids[winner.index].bidderName.trim(),
          saleRecordedBy: employeeId,
          completedAt: now,
          ...(hasSurplus ? {} : { settledBy: employeeId, settledAt: now }),
          saleBreakdown: {
            outstandingAtSale: { principal: money(owed.principal), interest: money(owed.interest), charges: money(owed.charges), total: money(owed.total) },
            appliedToInterest: money(s.toInterest),
            appliedToCharges: money(s.toCharges),
            appliedToPrincipal: money(s.toPrincipal),
            surplus: money(s.surplus),
            unrecoveredInterest: money(s.unrecoveredInterest),
            unrecoveredCharges: money(s.unrecoveredCharges),
            unrecoveredPrincipal: money(s.unrecoveredPrincipal),
            unrecoveredTotal: money(unrecovered),
          },
        },
        include: { bids: true },
      });
    });
  }

  /** 7. Pays the surplus back to the borrower. Someone other than the person who recorded the sale must do it. */
  async settle(id: string, dto: SettleAuctionDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (auction.status !== 'COMPLETED') this.conflict(auction.status === 'SETTLED' ? 'This auction is already settled.' : `Auction is ${auction.status}; there is no surplus to pay out yet.`);
    if (employeeId === auction.saleRecordedBy) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN, 'The person who recorded the sale cannot also pay out the surplus.');
    }
    const surplus = new Decimal(auction.surplusAmount ?? 0);
    if (surplus.lte(0)) this.conflict('There is no surplus to pay out.');

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoan(tx, auction.loanId);
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { status: true, saleBreakdown: true } });
      if (current.status !== 'COMPLETED') this.conflict('This auction is already settled.');
      await this.loansService.postFinancialLeg(tx, {
        loanId: auction.loanId,
        customerId: auction.loan.customerId,
        branchId: auction.loan.branchId,
        type: 'REFUND',
        amount: surplus,
        debitAccount: 'CUSTOMER_SURPLUS_PAYABLE',
        creditAccount: 'CASH',
        reference: auction.auctionNumber,
        idempotencyKey: `AUCTION-${id}-REFUND`,
        createdBy: employeeId,
      });
      const now = new Date();
      const breakdown = (current.saleBreakdown ?? {}) as Record<string, unknown>;
      return tx.auction.update({
        where: { id },
        data: {
          status: 'SETTLED',
          settledBy: employeeId,
          settledAt: now,
          saleBreakdown: { ...breakdown, surplusPaidOut: { amount: money(surplus), mode: dto.mode, reference: dto.reference?.trim() || null, paidAt: now.toISOString() } },
        },
      });
    });
  }

  /**
   * Writes off whatever a sale left owing once it is not expected to be recovered. Interest and charges are
   * waived (memo entries: they were never booked as income) and the principal goes to loss. Someone other than
   * the person who recorded the sale has to do it, and the reason stays on the record.
   */
  async writeOffShortfall(id: string, dto: WriteOffDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (!['COMPLETED', 'SETTLED'].includes(auction.status)) this.conflict('Only an auction where the gold has been sold can have a shortfall written off.');
    if (employeeId === auction.saleRecordedBy) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN, 'The person who recorded the sale cannot also write off what it left unpaid.');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoan(tx, auction.loanId);
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { saleBreakdown: true } });
      const owed = await this.outstandingIn(tx, auction.loanId);
      if (owed.total.lte(0.01)) this.conflict('Nothing is still owing on this loan, so there is nothing to write off.');

      const post = (part: string, type: 'ADJUSTMENT' | 'WAIVER', amount: Prisma.Decimal, debitAccount: string, creditAccount: string) =>
        this.loansService.postFinancialLeg(tx, {
          loanId: auction.loanId,
          customerId: auction.loan.customerId,
          branchId: auction.loan.branchId,
          type,
          amount,
          debitAccount,
          creditAccount,
          reference: auction.auctionNumber,
          idempotencyKey: `AUCTION-${id}-WRITEOFF-${part}`,
          createdBy: employeeId,
        });
      await post('PRINCIPAL', 'ADJUSTMENT', owed.principal, LEDGER.lossWriteOff, LEDGER.principalReceivable);
      await post('INTEREST', 'WAIVER', owed.interest, LEDGER.interestWaived, LEDGER.interestWaiverOffset);
      await post('CHARGES', 'WAIVER', owed.charges, LEDGER.chargesWaived, LEDGER.chargesWaiverOffset);

      const now = new Date();
      const breakdown = (current.saleBreakdown ?? {}) as Record<string, unknown>;
      return tx.auction.update({
        where: { id },
        data: {
          saleBreakdown: {
            ...breakdown,
            writtenOff: { principal: money(owed.principal), interest: money(owed.interest), charges: money(owed.charges), total: money(owed.total), reason: dto.reason.trim(), by: employeeId, at: now.toISOString() },
          },
        },
      });
    });
  }

  /** Calls an auction off before the sale (the borrower paid up, a mistake was found, …). The loan stays as it was. */
  async cancel(id: string, dto: CancelAuctionDto, actor: JwtPayloadUser) {
    const employeeId = this.employeeId(actor);
    const auction = await this.loadForAction(id, actor);
    if (!(OPEN_AUCTION_STATUSES as readonly string[]).includes(auction.status)) this.conflict(`Auction is ${auction.status}; it can no longer be cancelled.`);

    return this.prisma.$transaction(async (tx) => {
      await this.lockLoan(tx, auction.loanId);
      await this.lockAuction(tx, id);
      const current = await tx.auction.findUniqueOrThrow({ where: { id }, select: { status: true } });
      if (!(OPEN_AUCTION_STATUSES as readonly string[]).includes(current.status)) this.conflict(`Auction is ${current.status}; it can no longer be cancelled.`);
      // The gold goes back to being ordinary pledged security.
      await tx.collateral.updateMany({ where: { loanId: auction.loanId, status: 'AUCTION_PROCESS' }, data: { status: 'APPRAISED' } });
      return tx.auction.update({ where: { id }, data: { status: 'CANCELLED', cancelledBy: employeeId, cancelledAt: new Date(), cancelReason: dto.reason.trim() } });
    });
  }
}
