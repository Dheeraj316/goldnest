import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { CloseCashRegisterDto, OpenCashRegisterDto, QueryCashDayDto, QueryCashHistoryDto, RecordCashEntryDto } from './dto/cash.dto';

const { Decimal } = Prisma;

// The process runs in IST (see common/utils/interest.ts), so plain local Date components already
// give IST calendar-day boundaries — no timezone conversion needed.
function dayRange(dateStr?: string): { start: Date; end: Date; label: string } {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
  const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return { start, end, label };
}

const present = (t: { id: string; type: string; amount: Prisma.Decimal; reference: string | null; createdAt: Date; approvedBy: string | null; createdBy: string | null }) => ({
  id: t.id,
  type: t.type,
  amount: t.amount.toFixed(2),
  reference: t.reference,
  createdAt: t.createdAt,
  createdBy: t.createdBy,
  approvedBy: t.approvedBy,
});

@Injectable()
export class CashManagementService {
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

  private invalid(message: string): never {
    throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, message);
  }

  private employeeId(actor: JwtPayloadUser): string {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) this.notFound();
    return actor.employeeId;
  }

  // Branch-scoped staff always operate their own branch (no need to say so); a cross-branch role
  // must say which branch's register it means, since it has no "home" branch of its own.
  private resolveBranchId(user: JwtPayloadUser, requested?: string): string {
    if (this.branchScope.isCrossBranch(user)) {
      if (!requested) this.invalid('Choose a branch.');
      return requested;
    }
    if (requested) this.branchScope.assertAccess(user, requested);
    return requested ?? user.branchId!;
  }

  private async dayStatus(branchId: string, dateStr?: string) {
    const { start, end, label } = dayRange(dateStr);
    const entries = await this.prisma.cashTransaction.findMany({ where: { branchId, createdAt: { gte: start, lte: end } }, orderBy: { createdAt: 'asc' } });
    const opening = entries.find((e) => e.type === 'OPENING');
    const closing = entries.find((e) => e.type === 'CLOSING');
    let expected = new Decimal(0);
    for (const e of entries) {
      if (e.type === 'OPENING' || e.type === 'RECEIPT') expected = expected.plus(e.amount);
      else if (e.type === 'DISBURSEMENT' || e.type === 'TRANSFER') expected = expected.minus(e.amount);
    }
    return { label, entries, isOpen: !!opening, isClosed: !!closing, expectedBalance: expected };
  }

  async openDay(dto: OpenCashRegisterDto, actor: JwtPayloadUser) {
    const branchId = this.resolveBranchId(actor, dto.branchId);
    const status = await this.dayStatus(branchId);
    if (status.isOpen) this.conflict('The register for today is already open.');
    const row = await this.prisma.cashTransaction.create({ data: { branchId, type: 'OPENING', amount: dto.amount, createdBy: this.employeeId(actor) } });
    return present(row);
  }

  async recordEntry(dto: RecordCashEntryDto, actor: JwtPayloadUser) {
    const branchId = this.resolveBranchId(actor, dto.branchId);
    const status = await this.dayStatus(branchId);
    if (!status.isOpen) this.conflict('Open the register for today before recording entries.');
    if (status.isClosed) this.conflict('Today’s register is already closed.');
    const row = await this.prisma.cashTransaction.create({ data: { branchId, type: dto.type, amount: dto.amount, reference: dto.reference, createdBy: this.employeeId(actor) } });
    return present(row);
  }

  async closeDay(dto: CloseCashRegisterDto, actor: JwtPayloadUser) {
    const branchId = this.resolveBranchId(actor, dto.branchId);
    const status = await this.dayStatus(branchId);
    if (!status.isOpen) this.conflict('The register was never opened today.');
    if (status.isClosed) this.conflict('Today’s register is already closed.');
    const row = await this.prisma.cashTransaction.create({
      data: { branchId, type: 'CLOSING', amount: dto.amount, reference: dto.reference, createdBy: this.employeeId(actor), approvedBy: this.employeeId(actor) },
    });
    const variance = new Decimal(dto.amount).minus(status.expectedBalance);
    return { ...present(row), expectedBalance: status.expectedBalance.toFixed(2), countedAmount: new Decimal(dto.amount).toFixed(2), variance: variance.toFixed(2) };
  }

  async getDaySummary(query: QueryCashDayDto, user: JwtPayloadUser) {
    const branchId = this.resolveBranchId(user, query.branchId);
    const status = await this.dayStatus(branchId, query.date);
    return {
      branchId,
      date: status.label,
      isOpen: status.isOpen,
      isClosed: status.isClosed,
      expectedBalance: status.expectedBalance.toFixed(2),
      entries: status.entries.map(present),
    };
  }

  // One row per day this branch closed its register, most recent first — a quick trail of variances.
  async listHistory(query: QueryCashHistoryDto, user: JwtPayloadUser) {
    const where: Prisma.CashTransactionWhereInput = { type: 'CLOSING' };
    if (this.branchScope.isCrossBranch(user)) {
      if (query.branchId) where.branchId = query.branchId;
    } else {
      where.branchId = user.branchId!;
    }
    const [items, total] = await Promise.all([
      this.prisma.cashTransaction.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { branch: { select: { code: true, name: true } } } }),
      this.prisma.cashTransaction.count({ where }),
    ]);
    return { items: items.map((i) => ({ ...present(i), branch: i.branch })), total, page: query.page, pageSize: query.pageSize };
  }
}
