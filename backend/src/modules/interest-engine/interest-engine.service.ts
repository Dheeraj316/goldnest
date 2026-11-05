import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { calculatePeriodInterest, calculatePenalInterest } from '../../common/utils/interest';
import { isOverdue } from '../../common/utils/collections';
import { ledgerPaid } from '../../common/utils/loan-balance';

/**
 * Turns a loan + its in-force interest rule into stored InterestAccrual rows.
 * Every accrual is immutable once written (spec #77): the rule's exact
 * values are snapshotted into `ruleSnapshot` at accrual time, so a later
 * rate change never silently rewrites history — re-running this for a date
 * that's already accrued is a no-op (the unique [loanId, accrualDate]
 * constraint enforces that at the DB level too, not just in application
 * logic).
 */
@Injectable()
export class InterestEngineService {
  private readonly logger = new Logger(InterestEngineService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Outstanding principal as of `asOf` — disbursed principal minus everything that has cleared it by then:
   * repayments, and (after an auction) the sale proceeds applied to principal and any write-off.
   */
  async outstandingPrincipal(loanId: string, asOf: Date): Promise<Prisma.Decimal> {
    const loan = await this.prisma.loan.findUniqueOrThrow({ where: { id: loanId }, select: { principalAmount: true } });
    const paid = await ledgerPaid(this.prisma, loanId, asOf);
    return new Prisma.Decimal(loan.principalAmount).minus(paid.principal);
  }

  /**
   * Accrue interest for a single calendar day. Idempotent: if `accrualDate`
   * already has a row for this loan, it's returned unchanged rather than
   * duplicated.
   */
  async accrueForDate(loanId: string, accrualDate: Date) {
    const existing = await this.prisma.interestAccrual.findUnique({
      where: { loanId_accrualDate: { loanId, accrualDate } },
    });
    if (existing) {
      return existing;
    }

    const loan = await this.prisma.loan.findUniqueOrThrow({
      where: { id: loanId },
      select: { productId: true, interestRateSnapshot: true, startDate: true, maturityDate: true, product: { select: { gracePeriodDays: true } } },
    });
    if (!loan.startDate) {
      throw new Error(`Loan ${loanId} has not been disbursed yet — nothing to accrue.`);
    }

    const rule = await this.prisma.interestRule.findFirst({
      where: { productId: loan.productId, effectiveFrom: { lte: accrualDate }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: accrualDate } }] },
      orderBy: { effectiveFrom: 'desc' },
    });
    // A rate change on the product after disbursement does not retroactively
    // change an already-live loan's rate unless the product's own change
    // policy says so — this loan keeps the rate it was disbursed at
    // (interestRateSnapshot) as the default, falling back to whatever rule
    // is in force only if no snapshot exists (defensive, should not happen).
    const ratePercent = loan.interestRateSnapshot ?? rule?.annualRatePercent ?? new Prisma.Decimal(0);

    const principalBase = await this.outstandingPrincipal(loanId, accrualDate);
    // The grace period is penal-free: the same "maturity + grace" cut-off that
    // opens a collection case and that borrowers are shown on the product page.
    // Normal interest keeps accruing throughout; only the penal surcharge waits.
    const gracePeriodDays = loan.product.gracePeriodDays;
    const penalApplies = isOverdue(loan.maturityDate, gracePeriodDays, accrualDate);
    const penalRate = rule?.penalRatePercent ?? new Prisma.Decimal(0);

    const normalInterest = calculatePeriodInterest(principalBase, ratePercent, 1);
    const penalInterest = penalApplies ? calculatePenalInterest(principalBase, penalRate, 1) : new Prisma.Decimal(0);
    const interestAmount = normalInterest.plus(penalInterest);

    return this.prisma.interestAccrual.create({
      data: {
        loanId,
        accrualDate,
        principalBase,
        ratePercent,
        daysAccrued: 1,
        interestAmount,
        ruleSnapshot: rule
          ? { ruleId: rule.id, annualRatePercent: rule.annualRatePercent.toString(), penalRatePercent: rule.penalRatePercent.toString(), method: rule.method, gracePeriodDays }
          : Prisma.JsonNull,
      },
    });
  }

  /**
   * Accrue every un-accrued day from the loan's start date (or its last
   * accrual, whichever is later) up to and including today. Called on
   * demand from loan-detail reads and payment recording rather than a
   * separate cron job — correct either way since each day is idempotent,
   * and a proper scheduled daily run belongs with the rest of Phase K's
   * observability/ops work, not bolted on here.
   */
  async accrueUpToToday(loanId: string): Promise<void> {
    const loan = await this.prisma.loan.findUniqueOrThrow({ where: { id: loanId }, select: { startDate: true, status: true } });
    if (!loan.startDate || !['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      return;
    }
    const latest = await this.prisma.interestAccrual.findFirst({ where: { loanId }, orderBy: { accrualDate: 'desc' } });
    const today = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    let cursor = latest ? new Date(latest.accrualDate.getTime() + 86_400_000) : loan.startDate;

    let guard = 0;
    while (cursor <= today && guard < 3660) {
      // eslint-disable-next-line no-await-in-loop -- sequential by design: each day's accrual reads the outstanding principal as of that day, which depends on the previous day's state.
      await this.accrueForDate(loanId, cursor);
      cursor = new Date(cursor.getTime() + 86_400_000);
      guard++;
    }
    if (guard >= 3660) {
      this.logger.warn(`accrueUpToToday for loan ${loanId} hit the 3660-day safety guard — investigate.`);
    }
  }

  /** Sum of every accrual not yet paid off — what a customer actually owes in interest right now. */
  async interestOutstanding(loanId: string): Promise<Prisma.Decimal> {
    const [accrued, paid] = await Promise.all([
      this.prisma.interestAccrual.aggregate({ where: { loanId }, _sum: { interestAmount: true } }),
      ledgerPaid(this.prisma, loanId),
    ]);
    return new Prisma.Decimal(accrued._sum.interestAmount ?? 0).minus(paid.interest);
  }
}
