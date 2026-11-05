import { HttpStatus, Injectable } from '@nestjs/common';
import { LedgerTransactionType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { addDays } from '../../common/utils/interest';
import { ImportBankTransactionsDto, ManualMatchDto, QueryBankTransactionsDto } from './dto/reconciliation.dto';

// Ledger entries that represent real cash movement, and so can plausibly show up on a bank
// statement — excludes non-cash journal entries like INTEREST_ACCRUAL, WAIVER and ADJUSTMENT
// (an ADJUSTMENT can still be matched manually; it's just not offered as an auto-match candidate).
const RECONCILABLE_TYPES: LedgerTransactionType[] = ['INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'PENAL_CHARGE', 'FEE', 'DISBURSEMENT', 'AUCTION_PROCEEDS', 'REFUND'];
const MATCH_WINDOW_DAYS = 3;

type FtSummary = { type: string; amount: string; loanNumber: string | null; reference: string | null; createdAt: Date };

@Injectable()
export class ReconciliationService {
  constructor(private readonly prisma: PrismaService) {}

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

  private async financialTxnSummaries(ids: string[]): Promise<Map<string, FtSummary>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.financialTransaction.findMany({
      where: { id: { in: ids } },
      select: { id: true, type: true, amount: true, reference: true, createdAt: true, loan: { select: { loanNumber: true } } },
    });
    return new Map(rows.map((r) => [r.id, { type: r.type, amount: r.amount.toFixed(2), loanNumber: r.loan?.loanNumber ?? null, reference: r.reference, createdAt: r.createdAt }]));
  }

  // Every FinancialTransaction id already linked to some bank line — checked in bulk once per
  // auto-match sweep rather than per-candidate; fine at reconciliation's realistic data volume.
  private async alreadyMatchedFtIds(): Promise<string[]> {
    const rows = await this.prisma.reconciliationRecord.findMany({ select: { financialTransactionId: true } });
    return rows.map((r) => r.financialTransactionId).filter((id): id is string => !!id);
  }

  private async candidatesFor(bt: { amount: Prisma.Decimal; valueDate: Date }, excludeIds: string[]) {
    return this.prisma.financialTransaction.findMany({
      where: {
        type: { in: RECONCILABLE_TYPES },
        amount: bt.amount,
        createdAt: { gte: addDays(bt.valueDate, -MATCH_WINDOW_DAYS), lte: addDays(bt.valueDate, MATCH_WINDOW_DAYS + 1) },
        id: { notIn: excludeIds },
      },
      include: { loan: { select: { loanNumber: true } } },
    });
  }

  async getMatchCandidates(id: string) {
    const bt = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!bt) this.notFound();
    const excluded = await this.alreadyMatchedFtIds();
    const candidates = await this.candidatesFor(bt, excluded);
    return candidates.map((c) => ({ id: c.id, type: c.type, amount: c.amount.toFixed(2), createdAt: c.createdAt, reference: c.reference, loanNumber: c.loan?.loanNumber ?? null }));
  }

  // Idempotent: only acts on currently-unmatched bank lines, and only auto-matches when exactly
  // one reconcilable candidate exists — an ambiguous or absent match is left for a human.
  async autoMatchAll(): Promise<{ scanned: number; matched: number }> {
    const unmatched = await this.prisma.bankTransaction.findMany({ where: { isMatched: false } });
    let matched = 0;
    const excluded = await this.alreadyMatchedFtIds();
    const excludedSet = new Set(excluded);
    for (const bt of unmatched) {
      const candidates = await this.candidatesFor(bt, [...excludedSet]);
      if (candidates.length === 1) {
        await this.prisma.$transaction([
          this.prisma.reconciliationRecord.create({ data: { bankTransactionId: bt.id, financialTransactionId: candidates[0].id, matchType: 'AUTO' } }),
          this.prisma.bankTransaction.update({ where: { id: bt.id }, data: { isMatched: true } }),
        ]);
        excludedSet.add(candidates[0].id);
        matched++;
      }
    }
    return { scanned: unmatched.length, matched };
  }

  async importTransactions(dto: ImportBankTransactionsDto) {
    await this.prisma.$transaction(
      dto.transactions.map((t) => this.prisma.bankTransaction.create({ data: { bankRef: t.bankRef, amount: t.amount, valueDate: new Date(t.valueDate), description: t.description } })),
    );
    const result = await this.autoMatchAll();
    return { imported: dto.transactions.length, autoMatched: result.matched };
  }

  async manualMatch(id: string, dto: ManualMatchDto, actor: JwtPayloadUser) {
    const bt = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!bt) this.notFound();
    if (bt.isMatched) this.conflict('This bank line is already matched.');
    const ft = await this.prisma.financialTransaction.findUnique({ where: { id: dto.financialTransactionId } });
    if (!ft) this.notFound();
    const alreadyLinked = await this.prisma.reconciliationRecord.findFirst({ where: { financialTransactionId: dto.financialTransactionId } });
    if (alreadyLinked) this.conflict('That transaction is already matched to a different bank line.');
    await this.prisma.$transaction([
      this.prisma.reconciliationRecord.create({ data: { bankTransactionId: id, financialTransactionId: dto.financialTransactionId, matchType: 'MANUAL', matchedBy: this.employeeId(actor) } }),
      this.prisma.bankTransaction.update({ where: { id }, data: { isMatched: true } }),
    ]);
    return this.getOne(id);
  }

  async unmatch(id: string) {
    const bt = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!bt) this.notFound();
    if (!bt.isMatched) this.conflict('This bank line is not matched.');
    await this.prisma.$transaction([
      this.prisma.reconciliationRecord.deleteMany({ where: { bankTransactionId: id } }),
      this.prisma.bankTransaction.update({ where: { id }, data: { isMatched: false } }),
    ]);
    return this.getOne(id);
  }

  private async present(bt: { id: string; bankRef: string; amount: Prisma.Decimal; valueDate: Date; description: string | null; isMatched: boolean }, rec?: { matchType: string; matchedAt: Date; matchedBy: string | null; financialTransactionId: string | null } | null, ftMap?: Map<string, FtSummary>) {
    return {
      id: bt.id,
      bankRef: bt.bankRef,
      amount: bt.amount.toFixed(2),
      valueDate: bt.valueDate,
      description: bt.description,
      isMatched: bt.isMatched,
      match: rec
        ? { matchType: rec.matchType, matchedAt: rec.matchedAt, matchedBy: rec.matchedBy, financialTransaction: rec.financialTransactionId ? (ftMap?.get(rec.financialTransactionId) ?? null) : null }
        : null,
    };
  }

  async getOne(id: string) {
    const bt = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!bt) this.notFound();
    const rec = await this.prisma.reconciliationRecord.findFirst({ where: { bankTransactionId: id } });
    const ftMap = rec?.financialTransactionId ? await this.financialTxnSummaries([rec.financialTransactionId]) : undefined;
    return this.present(bt, rec, ftMap);
  }

  async list(query: QueryBankTransactionsDto) {
    const where: Prisma.BankTransactionWhereInput = {};
    if (query.matched !== undefined) where.isMatched = query.matched;
    const [items, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({ where, orderBy: { valueDate: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.bankTransaction.count({ where }),
    ]);
    const recs = await this.prisma.reconciliationRecord.findMany({ where: { bankTransactionId: { in: items.map((i) => i.id) } } });
    const recByBt = new Map(recs.map((r) => [r.bankTransactionId, r]));
    const ftMap = await this.financialTxnSummaries(recs.map((r) => r.financialTransactionId).filter((id): id is string => !!id));
    return { items: await Promise.all(items.map((bt) => this.present(bt, recByBt.get(bt.id), ftMap))), total, page: query.page, pageSize: query.pageSize };
  }
}
