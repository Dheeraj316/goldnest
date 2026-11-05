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
import { daysPastDue, isOverdue } from '../../common/utils/collections';
import { AssignCaseDto, CreatePromiseDto, LogActivityDto, QueryCasesDto } from './dto/collections.dto';

const { Decimal } = Prisma;

const todayUtc = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export interface SweepResult {
  markedOverdue: number;
  casesOpened: number;
  casesClosed: number;
  promisesKept: number;
  promisesBroken: number;
  errors: number;
}

@Injectable()
export class CollectionsService {
  private readonly logger = new Logger(CollectionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly numberGenerator: NumberGeneratorService,
    private readonly interestEngine: InterestEngineService,
    private readonly loansService: LoansService,
  ) {}

  // =====================================================================
  // SWEEP — idempotent, safe to run any number of times per day
  // =====================================================================

  async runSweep(actorEmployeeId?: string): Promise<SweepResult> {
    const now = new Date();
    const result: SweepResult = { markedOverdue: 0, casesOpened: 0, casesClosed: 0, promisesKept: 0, promisesBroken: 0, errors: 0 };

    // 1. ACTIVE loans past maturity + grace become OVERDUE and get a case;
    //    OVERDUE loans that somehow lack an open case (e.g. a failed earlier
    //    run) get one too.
    const [pastMaturity, orphaned] = await Promise.all([
      this.prisma.loan.findMany({
        where: { status: 'ACTIVE', maturityDate: { lt: now } },
        select: { id: true, maturityDate: true, product: { select: { gracePeriodDays: true } } },
      }),
      this.prisma.loan.findMany({
        where: { status: 'OVERDUE', collectionCases: { none: { status: 'OPEN' } } },
        select: { id: true },
      }),
    ]);
    const loanIds = new Set<string>(orphaned.map((l) => l.id));
    for (const l of pastMaturity) {
      if (isOverdue(l.maturityDate, l.product.gracePeriodDays, now)) loanIds.add(l.id);
    }
    for (const loanId of loanIds) {
      try {
        const r = await this.markOverdueAndOpenCase(loanId, now, actorEmployeeId);
        if (r.marked) result.markedOverdue++;
        if (r.caseOpened) result.casesOpened++;
      } catch (e) {
        result.errors++;
        this.logger.error(`Overdue sweep failed for loan ${loanId}: ${(e as Error).message}`);
      }
    }

    // 2. Promises whose date has passed are judged BEFORE their case can be
    //    closed, so a customer who paid and closed the loan is credited with
    //    a kept promise rather than a cancelled one.
    await this.resolveDuePromises(now, result);

    // 3. Cases for loans that are no longer collectable (closed / renewed).
    await this.closeSettledCases(now, result);

    return result;
  }

  private async markOverdueAndOpenCase(loanId: string, now: Date, actorEmployeeId?: string) {
    return this.prisma.$transaction(async (tx) => {
      // Serialise against payments/renewals/closure touching the same loan.
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId}::uuid FOR UPDATE`;
      const loan = await tx.loan.findUnique({ where: { id: loanId }, include: { product: { select: { gracePeriodDays: true } } } });
      if (!loan) return { marked: false, caseOpened: false };

      const dpd = daysPastDue(loan.maturityDate, loan.product.gracePeriodDays, now);
      let marked = false;
      if (loan.status === 'ACTIVE') {
        if (dpd < 1) return { marked: false, caseOpened: false };
        await tx.loan.update({ where: { id: loanId }, data: { status: 'OVERDUE' } });
        await tx.loanStatusHistory.create({
          data: {
            loanId,
            fromStatus: 'ACTIVE',
            toStatus: 'OVERDUE',
            changedBy: actorEmployeeId,
            reason: `Past maturity + ${loan.product.gracePeriodDays}-day grace (${dpd} day(s) overdue)`,
          },
        });
        marked = true;
      } else if (loan.status !== 'OVERDUE') {
        return { marked: false, caseOpened: false };
      }

      const open = await tx.collectionCase.findFirst({ where: { loanId, status: 'OPEN' }, select: { id: true } });
      if (open) return { marked, caseOpened: false };

      const caseNumber = await this.numberGenerator.generateCollectionCaseNumber();
      await tx.collectionCase.create({
        data: {
          caseNumber,
          loanId,
          customerId: loan.customerId,
          branchId: loan.branchId,
          activities: { create: { type: 'SYSTEM', notes: `Case opened automatically: ${dpd} day(s) past due.` } },
        },
      });
      return { marked, caseOpened: true };
    });
  }

  private async resolveDuePromises(now: Date, result: SweepResult) {
    const due = await this.prisma.promiseToPay.findMany({
      where: { status: 'PENDING', promisedDate: { lt: todayUtc(now) } },
      include: { case: { select: { loanId: true } } },
    });
    for (const p of due) {
      try {
        // Only money received between the promise being made and the end of
        // the promised day counts towards keeping it.
        const paid = await this.prisma.receipt.aggregate({
          where: { loanId: p.case.loanId, createdAt: { gte: p.createdAt, lt: addDays(p.promisedDate, 1) } },
          _sum: { totalAmount: true },
        });
        const received = new Decimal(paid._sum.totalAmount ?? 0);
        const kept = received.gte(p.promisedAmount);
        const flipped = await this.prisma.promiseToPay.updateMany({
          where: { id: p.id, status: 'PENDING' },
          data: { status: kept ? 'KEPT' : 'BROKEN', resolvedAt: now },
        });
        if (flipped.count === 1) {
          await this.prisma.collectionActivity.create({
            data: {
              caseId: p.caseId,
              type: 'SYSTEM',
              notes: kept
                ? `Promise of ₹${p.promisedAmount.toFixed(2)} by ${p.promisedDate.toISOString().slice(0, 10)} KEPT (₹${received.toFixed(2)} received).`
                : `Promise of ₹${p.promisedAmount.toFixed(2)} by ${p.promisedDate.toISOString().slice(0, 10)} BROKEN (₹${received.toFixed(2)} received).`,
            },
          });
          if (kept) result.promisesKept++;
          else result.promisesBroken++;
        }
      } catch (e) {
        result.errors++;
        this.logger.error(`Promise ${p.id} resolution failed: ${(e as Error).message}`);
      }
    }
  }

  private async closeSettledCases(now: Date, result: SweepResult) {
    const settled = await this.prisma.collectionCase.findMany({
      where: { status: 'OPEN', loan: { status: { in: ['CLOSED', 'RENEWED', 'AUCTIONED'] } } },
      select: { id: true, loan: { select: { status: true } } },
    });
    for (const c of settled) {
      try {
        const reason = `Loan ${c.loan.status.toLowerCase()}`;
        await this.prisma.$transaction([
          this.prisma.collectionCase.update({ where: { id: c.id }, data: { status: 'CLOSED', closedAt: now, closeReason: reason } }),
          this.prisma.promiseToPay.updateMany({ where: { caseId: c.id, status: 'PENDING' }, data: { status: 'CANCELLED', resolvedAt: now } }),
          this.prisma.collectionActivity.create({ data: { caseId: c.id, type: 'SYSTEM', notes: `Case closed: ${reason}.` } }),
        ]);
        result.casesClosed++;
      } catch (e) {
        result.errors++;
        this.logger.error(`Closing case ${c.id} failed: ${(e as Error).message}`);
      }
    }
  }

  // =====================================================================
  // READS
  // =====================================================================

  async summary(user: JwtPayloadUser) {
    const branch = this.branchFilter(user);
    const today = todayUtc();
    const [openCases, unassigned, promisesDueToday, brokenLast7Days] = await Promise.all([
      this.prisma.collectionCase.count({ where: { ...branch, status: 'OPEN' } }),
      this.prisma.collectionCase.count({ where: { ...branch, status: 'OPEN', assignedTo: null } }),
      this.prisma.promiseToPay.count({ where: { status: 'PENDING', promisedDate: today, case: { ...branch, status: 'OPEN' } } }),
      this.prisma.promiseToPay.count({ where: { status: 'BROKEN', resolvedAt: { gte: addDays(today, -7) }, case: branch } }),
    ]);
    return { openCases, unassigned, promisesDueToday, brokenLast7Days };
  }

  async listCases(query: QueryCasesDto, user: JwtPayloadUser) {
    const branch = this.branchScope.isCrossBranch(user) ? (query.branchId ? { branchId: query.branchId } : {}) : { branchId: user.branchId };
    const where: Prisma.CollectionCaseWhereInput = {
      ...branch,
      status: query.status,
      ...(query.assignedToMe === 'true' && user.employeeId ? { assignedTo: user.employeeId } : {}),
    };
    const now = new Date();
    const [rows, total] = await Promise.all([
      this.prisma.collectionCase.findMany({
        where,
        orderBy: query.status === 'OPEN' ? { loan: { maturityDate: 'asc' } } : { closedAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: {
          loan: { select: { id: true, loanNumber: true, principalAmount: true, maturityDate: true, product: { select: { gracePeriodDays: true } } } },
          customer: { select: { firstName: true, lastName: true, mobile: true, customerCode: true } },
          assignee: { select: { firstName: true, lastName: true } },
          activities: { where: { type: { not: 'SYSTEM' } }, orderBy: { occurredAt: 'desc' }, take: 1 },
          promises: { where: { status: 'PENDING' }, orderBy: { promisedDate: 'asc' }, take: 1 },
        },
      }),
      this.prisma.collectionCase.count({ where }),
    ]);
    const items = rows.map((c) => ({
      id: c.id,
      caseNumber: c.caseNumber,
      status: c.status,
      openedAt: c.openedAt,
      closedAt: c.closedAt,
      closeReason: c.closeReason,
      daysPastDue: daysPastDue(c.loan.maturityDate, c.loan.product.gracePeriodDays, now),
      loan: { id: c.loan.id, loanNumber: c.loan.loanNumber, principalAmount: c.loan.principalAmount, maturityDate: c.loan.maturityDate },
      customer: c.customer,
      assignee: c.assignee,
      lastActivity: c.activities[0] ?? null,
      nextPromise: c.promises[0] ?? null,
    }));
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getCase(caseId: string, user: JwtPayloadUser) {
    const c = await this.loadCase(caseId, user);
    const full = await this.prisma.collectionCase.findUniqueOrThrow({
      where: { id: caseId },
      include: {
        loan: { select: { id: true, loanNumber: true, status: true, principalAmount: true, maturityDate: true, product: { select: { name: true, gracePeriodDays: true } } } },
        customer: { select: { firstName: true, lastName: true, mobile: true, customerCode: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        activities: { orderBy: { occurredAt: 'desc' }, include: { employee: { select: { firstName: true, lastName: true } } } },
        promises: { orderBy: { createdAt: 'desc' } },
      },
    });
    let outstanding: { principal: string; interest: string; charges: string; total: string } | null = null;
    if (['ACTIVE', 'OVERDUE'].includes(full.loan.status)) {
      await this.interestEngine.accrueUpToToday(c.loanId);
      const b = await this.loansService.getOutstandingBreakdown(c.loanId);
      outstanding = { principal: b.principal.toFixed(2), interest: b.interest.toFixed(2), charges: b.charges.toFixed(2), total: b.total.toFixed(2) };
    }
    return {
      ...full,
      daysPastDue: daysPastDue(full.loan.maturityDate, full.loan.product.gracePeriodDays, new Date()),
      outstanding,
    };
  }

  async listAssignees(caseId: string, user: JwtPayloadUser) {
    const c = await this.loadCase(caseId, user);
    return this.prisma.employee.findMany({
      where: { branchId: c.branchId, status: 'ACTIVE', deletedAt: null, role: { code: 'COLLECTION_OFFICER' } },
      orderBy: { firstName: 'asc' },
      select: { id: true, employeeCode: true, firstName: true, lastName: true },
    });
  }

  // =====================================================================
  // WRITES
  // =====================================================================

  async logActivity(caseId: string, dto: LogActivityDto, user: JwtPayloadUser) {
    const c = await this.loadCase(caseId, user);
    this.assertOpen(c.status);
    return this.prisma.collectionActivity.create({
      data: { caseId, employeeId: user.employeeId, type: dto.type, outcome: dto.outcome, notes: dto.notes },
    });
  }

  async createPromise(caseId: string, dto: CreatePromiseDto, user: JwtPayloadUser) {
    const c = await this.loadCase(caseId, user);
    this.assertOpen(c.status);
    if (!user.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }

    const promisedDate = new Date(`${dto.promisedDate.slice(0, 10)}T00:00:00.000Z`);
    if (promisedDate < todayUtc()) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'The promised date cannot be in the past.');
    }

    await this.interestEngine.accrueUpToToday(c.loanId);
    const outstanding = await this.loansService.getOutstandingBreakdown(c.loanId);
    const amount = new Decimal(dto.promisedAmount);
    if (amount.gt(outstanding.total)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `The promised amount (₹${amount.toFixed(2)}) exceeds the total outstanding (₹${outstanding.total.toFixed(2)}).`,
      );
    }

    const employeeId = user.employeeId;
    return this.prisma.$transaction(async (tx) => {
      // A newer promise supersedes any still-pending one, rather than leaving
      // two live promises that the sweep would later judge independently.
      await tx.promiseToPay.updateMany({ where: { caseId, status: 'PENDING' }, data: { status: 'CANCELLED', resolvedAt: new Date() } });
      const promise = await tx.promiseToPay.create({ data: { caseId, promisedAmount: amount, promisedDate, recordedBy: employeeId } });
      await tx.collectionActivity.create({
        data: {
          caseId,
          employeeId,
          type: 'NOTE',
          outcome: 'PROMISED',
          notes: `Promise to pay ₹${amount.toFixed(2)} by ${dto.promisedDate.slice(0, 10)}.`,
        },
      });
      return promise;
    });
  }

  async assign(caseId: string, dto: AssignCaseDto, user: JwtPayloadUser) {
    const c = await this.loadCase(caseId, user);
    this.assertOpen(c.status);
    const target = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, status: 'ACTIVE', deletedAt: null, branchId: c.branchId, role: { code: 'COLLECTION_OFFICER' } },
      select: { id: true, firstName: true, lastName: true },
    });
    if (!target) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "Cases can only be assigned to an active collection officer at the case's own branch.",
      );
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.collectionCase.update({ where: { id: caseId }, data: { assignedTo: target.id } }),
      this.prisma.collectionActivity.create({
        data: { caseId, employeeId: user.employeeId, type: 'SYSTEM', notes: `Assigned to ${target.firstName} ${target.lastName ?? ''}`.trim() + '.' },
      }),
    ]);
    return updated;
  }

  // =====================================================================
  // helpers
  // =====================================================================

  private branchFilter(user: JwtPayloadUser): Prisma.CollectionCaseWhereInput {
    return this.branchScope.isCrossBranch(user) ? {} : { branchId: user.branchId };
  }

  private async loadCase(caseId: string, user: JwtPayloadUser) {
    const c = await this.prisma.collectionCase.findUnique({ where: { id: caseId } });
    if (!c) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(user, c.branchId);
    return c;
  }

  private assertOpen(status: string) {
    if (status !== 'OPEN') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, 'This collection case is closed.');
    }
  }
}
