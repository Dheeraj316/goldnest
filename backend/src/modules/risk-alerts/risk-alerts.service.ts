import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { daysPastDue } from '../../common/utils/collections';
import { QueryAlertsDto, ReviewAlertDto, RISK_RULES } from './dto/risk-alert.dto';

const SEVERITY_RANK: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
const STATUS_RANK: Record<string, number> = { OPEN: 0, ESCALATED: 1, REVIEWED: 2, DISMISSED: 3 };

const fullName = (p: { firstName: string; lastName: string | null } | null | undefined) => (p ? [p.firstName, p.lastName].filter(Boolean).join(' ') : null);

type AlertRow = { id: string; ruleCode: string; severity: string; subjectType: string; subjectId: string; details: unknown; status: string; reviewedBy: string | null; reviewedAt: Date | null; createdAt: Date };
type Subject = { branchId: string | null; label: string };

@Injectable()
export class RiskAlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
  ) {}

  private notFound(): never {
    throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
  }

  private conflict(message: string): never {
    throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, message);
  }

  private employeeId(actor: JwtPayloadUser): string {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) this.notFound();
    return actor.employeeId;
  }

  // RiskAlert's subject is polymorphic (subjectType/subjectId), so branch and display info are
  // resolved with one bulk lookup per subject type rather than a Prisma relation.
  private async subjects(alerts: Pick<AlertRow, 'subjectType' | 'subjectId'>[]): Promise<Map<string, Subject>> {
    const ids = (t: string) => [...new Set(alerts.filter((a) => a.subjectType === t).map((a) => a.subjectId))];
    const [customers, loans, employees, collaterals] = await Promise.all([
      this.prisma.customer.findMany({ where: { id: { in: ids('CUSTOMER') } }, select: { id: true, branchId: true, firstName: true, lastName: true, customerCode: true } }),
      this.prisma.loan.findMany({ where: { id: { in: ids('LOAN') } }, select: { id: true, branchId: true, loanNumber: true } }),
      this.prisma.employee.findMany({ where: { id: { in: ids('EMPLOYEE') } }, select: { id: true, branchId: true, firstName: true, lastName: true, employeeCode: true } }),
      this.prisma.collateral.findMany({ where: { id: { in: ids('COLLATERAL') } }, select: { id: true, branchId: true, collateralCode: true } }),
    ]);
    const map = new Map<string, Subject>();
    for (const c of customers) map.set(`CUSTOMER:${c.id}`, { branchId: c.branchId, label: `${fullName(c)} (${c.customerCode})` });
    for (const l of loans) map.set(`LOAN:${l.id}`, { branchId: l.branchId, label: l.loanNumber });
    for (const e of employees) map.set(`EMPLOYEE:${e.id}`, { branchId: e.branchId, label: `${fullName(e)} (${e.employeeCode})` });
    for (const col of collaterals) map.set(`COLLATERAL:${col.id}`, { branchId: col.branchId, label: col.collateralCode });
    return map;
  }

  private present(alert: AlertRow, subject: Subject | undefined) {
    return {
      id: alert.id,
      ruleCode: alert.ruleCode,
      ruleLabel: (RISK_RULES as Record<string, { label: string }>)[alert.ruleCode]?.label ?? alert.ruleCode,
      severity: alert.severity,
      subjectType: alert.subjectType,
      subjectId: alert.subjectId,
      subjectLabel: subject?.label ?? null,
      details: alert.details,
      status: alert.status,
      reviewedBy: alert.reviewedBy,
      reviewedAt: alert.reviewedAt,
      createdAt: alert.createdAt,
    };
  }

  // RiskAlert carries no branchId of its own — scoping resolves through the subject. Fine at this
  // table's realistic scale (an alert queue, not a high-volume ledger); a denormalised branchId
  // column would be the right move if this ever needs to stay correct at high volume.
  async list(user: JwtPayloadUser, query: QueryAlertsDto) {
    const where: Prisma.RiskAlertWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.severity) where.severity = query.severity;
    if (query.subjectType) where.subjectType = query.subjectType;

    const candidates = await this.prisma.riskAlert.findMany({ where, orderBy: { createdAt: 'desc' }, take: 500 });
    const subjectMap = await this.subjects(candidates);

    let scoped = candidates;
    const wantBranch = this.branchScope.isCrossBranch(user) ? query.branchId : user.branchId;
    if (wantBranch) scoped = scoped.filter((a) => subjectMap.get(`${a.subjectType}:${a.subjectId}`)?.branchId === wantBranch);

    scoped.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.createdAt.getTime() - a.createdAt.getTime());

    const total = scoped.length;
    const start = (query.page - 1) * query.pageSize;
    const page = scoped.slice(start, start + query.pageSize);
    return { items: page.map((a) => this.present(a, subjectMap.get(`${a.subjectType}:${a.subjectId}`))), total, page: query.page, pageSize: query.pageSize };
  }

  async get(user: JwtPayloadUser, id: string) {
    const alert = await this.prisma.riskAlert.findUnique({ where: { id } });
    if (!alert) this.notFound();
    const subject = (await this.subjects([alert])).get(`${alert.subjectType}:${alert.subjectId}`);
    if (subject?.branchId) this.branchScope.assertAccess(user, subject.branchId);
    return this.present(alert, subject);
  }

  async review(user: JwtPayloadUser, id: string, dto: ReviewAlertDto) {
    const alert = await this.prisma.riskAlert.findUnique({ where: { id } });
    if (!alert) this.notFound();
    if (alert.status !== 'OPEN' && alert.status !== 'ESCALATED') this.conflict('This alert has already been closed out.');
    const subject = (await this.subjects([alert])).get(`${alert.subjectType}:${alert.subjectId}`);
    if (subject?.branchId) this.branchScope.assertAccess(user, subject.branchId);

    const details = { ...((alert.details as Record<string, unknown>) ?? {}), reviewNote: dto.note ?? null };
    const updated = await this.prisma.riskAlert.update({
      where: { id },
      data: { status: dto.decision, reviewedBy: this.employeeId(user), reviewedAt: new Date(), details },
    });
    return this.present(updated, subject);
  }

  // The rule sweep: idempotent, safe to run from the nightly scheduler or an on-demand trigger.
  // Thresholds are starting values pending compliance sign-off — see dto/risk-alert.dto.ts.
  async scan(): Promise<{ created: number; rules: Record<string, number> }> {
    const now = new Date();
    type Candidate = { ruleCode: string; subjectType: string; subjectId: string; severity: string; details: Prisma.InputJsonValue };
    const candidates: Candidate[] = [];

    const activeLoans = await this.prisma.loan.findMany({
      where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
      select: { id: true, customerId: true, principalAmount: true, approvedLtvPercent: true, status: true, maturityDate: true, product: { select: { gracePeriodDays: true } } },
    });
    for (const l of activeLoans) {
      const ltv = Number(l.approvedLtvPercent);
      if (ltv >= RISK_RULES.HIGH_LTV.thresholdPercent) {
        candidates.push({ ruleCode: 'HIGH_LTV', subjectType: 'LOAN', subjectId: l.id, severity: RISK_RULES.HIGH_LTV.severity, details: { ltvPercent: ltv } });
      }
      const principal = Number(l.principalAmount);
      if (principal >= RISK_RULES.LARGE_LOAN.thresholdAmount) {
        candidates.push({ ruleCode: 'LARGE_LOAN', subjectType: 'LOAN', subjectId: l.id, severity: RISK_RULES.LARGE_LOAN.severity, details: { principalAmount: principal } });
      }
      if (l.status === 'OVERDUE') {
        const dpd = daysPastDue(l.maturityDate, l.product.gracePeriodDays, now);
        if (dpd >= RISK_RULES.SEVERELY_OVERDUE.thresholdDays) {
          candidates.push({ ruleCode: 'SEVERELY_OVERDUE', subjectType: 'LOAN', subjectId: l.id, severity: RISK_RULES.SEVERELY_OVERDUE.severity, details: { daysPastDue: dpd } });
        }
      }
    }

    const perCustomer = new Map<string, number>();
    for (const l of activeLoans) perCustomer.set(l.customerId, (perCustomer.get(l.customerId) ?? 0) + 1);
    for (const [customerId, count] of perCustomer) {
      if (count >= RISK_RULES.MULTIPLE_ACTIVE_LOANS.thresholdCount) {
        candidates.push({ ruleCode: 'MULTIPLE_ACTIVE_LOANS', subjectType: 'CUSTOMER', subjectId: customerId, severity: RISK_RULES.MULTIPLE_ACTIVE_LOANS.severity, details: { activeLoanCount: count } });
      }
    }

    const recentlyDisbursed = await this.prisma.loan.findMany({
      where: { disbursedAt: { not: null }, status: { in: ['ACTIVE', 'OVERDUE', 'AUCTION_PROCESS'] } },
      select: { id: true, customerId: true, disbursedAt: true },
    });
    if (recentlyDisbursed.length) {
      const priorClosures = await this.prisma.loan.findMany({
        where: { customerId: { in: [...new Set(recentlyDisbursed.map((l) => l.customerId))] }, status: 'CLOSED', closedAt: { not: null } },
        select: { customerId: true, closedAt: true },
        orderBy: { closedAt: 'desc' },
      });
      const lastClosedByCustomer = new Map<string, Date>();
      for (const c of priorClosures) if (!lastClosedByCustomer.has(c.customerId) && c.closedAt) lastClosedByCustomer.set(c.customerId, c.closedAt);
      for (const l of recentlyDisbursed) {
        const lastClosed = lastClosedByCustomer.get(l.customerId);
        if (!lastClosed || !l.disbursedAt) continue;
        const gapDays = Math.floor((l.disbursedAt.getTime() - lastClosed.getTime()) / 86400000);
        if (gapDays >= 0 && gapDays <= RISK_RULES.RAPID_REBORROW.thresholdDays) {
          candidates.push({ ruleCode: 'RAPID_REBORROW', subjectType: 'LOAN', subjectId: l.id, severity: RISK_RULES.RAPID_REBORROW.severity, details: { gapDays } });
        }
      }
    }

    // Skip a rule+subject combination that has ever been raised before, not just while it's still OPEN —
    // otherwise a nightly re-scan would put a DISMISSED alert straight back the next night. The trade-off:
    // once someone has looked at it, it won't be raised again even if the underlying state gets worse (e.g.
    // a SEVERELY_OVERDUE loan falling further behind). Good enough for a first pass; a real re-alert-on-
    // worsening rule would need a per-rule "already seen at this level" check, not a blanket one.
    const existing = await this.prisma.riskAlert.findMany({ select: { ruleCode: true, subjectType: true, subjectId: true } });
    const existingKeys = new Set(existing.map((e) => `${e.ruleCode}:${e.subjectType}:${e.subjectId}`));
    const toInsert = candidates.filter((c) => !existingKeys.has(`${c.ruleCode}:${c.subjectType}:${c.subjectId}`));

    if (toInsert.length) {
      await this.prisma.riskAlert.createMany({
        data: toInsert.map((c) => ({ ruleCode: c.ruleCode, subjectType: c.subjectType, subjectId: c.subjectId, severity: c.severity, details: c.details, status: 'OPEN' })),
      });
    }
    const rules: Record<string, number> = {};
    for (const c of toInsert) rules[c.ruleCode] = (rules[c.ruleCode] ?? 0) + 1;
    return { created: toInsert.length, rules };
  }
}
