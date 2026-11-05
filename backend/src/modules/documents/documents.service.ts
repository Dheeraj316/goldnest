import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { LoansService } from '../loans/loans.service';
import { InterestEngineService } from '../interest-engine/interest-engine.service';
import { DocumentKind, signDownloadToken, verifyDownloadToken } from './download-token';
import { renderAuctionNoticePdf, renderReceiptPdf, renderStatementPdf, StatementLine } from './pdf-render';

const { Decimal } = Prisma;

export interface RenderedDocument {
  bytes: Buffer;
  filename: string;
}

const TXN_LABEL: Record<string, string> = {
  DISBURSEMENT: 'Loan amount disbursed',
  INTEREST_PAYMENT: 'Interest paid',
  PRINCIPAL_PAYMENT: 'Principal repaid',
  FEE: 'Charges paid',
  WAIVER: 'Waiver',
  REFUND: 'Refund',
  CLOSURE: 'Loan closure',
  ADJUSTMENT: 'Adjustment',
  PENAL_CHARGE: 'Penal charge',
  AUCTION_PROCEEDS: 'Auction proceeds',
};

// A borrower's notice is only meaningful while the auction is still open and the notice has gone out.
const NOTICE_LIVE_STATUSES = ['NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED'];

// Placeholder wording, used only until the lender's legal team sets the approved text in Configuration
// (AUCTION_NOTICE_LEGAL_TEXT). It states the process; it makes no claim about what the law requires.
const DEFAULT_NOTICE_LEGAL_TEXT =
  'This notice is issued because the loan above has not been repaid by its due date. If the amount due is not paid within the notice period, ' +
  'the pledged gold may be sold at auction in accordance with your loan agreement and applicable law, and the sale money applied to what you owe. ' +
  'Any amount left over after your loan has been cleared will be paid back to you. If you believe this notice is wrong, or you need more time, ' +
  'please contact your branch straight away.';

// What each part of an auction sale was applied to, keyed by the ledger account it was credited to.
const AUCTION_LEG_LABEL: Record<string, string> = {
  INTEREST_INCOME: 'Auction sale proceeds applied to interest',
  FEE_INCOME: 'Auction sale proceeds applied to charges',
  LOAN_PRINCIPAL_RECEIVABLE: 'Auction sale proceeds applied to principal',
  CUSTOMER_SURPLUS_PAYABLE: 'Auction surplus held for the borrower',
};

// A write-off after an auction shortfall, keyed by "type:credited account".
const WRITE_OFF_LABEL: Record<string, string> = {
  'ADJUSTMENT:LOAN_PRINCIPAL_RECEIVABLE': 'Principal written off (not recovered after the auction)',
  'WAIVER:INTEREST_WAIVER_OFFSET': 'Interest waived (not recovered after the auction)',
  'WAIVER:CHARGES_WAIVER_OFFSET': 'Charges waived (not recovered after the auction)',
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly loansService: LoansService,
    private readonly interestEngine: InterestEngineService,
    private readonly config: ConfigService,
  ) {}

  private get secret(): string {
    return this.config.get<string>('jwt.accessSecret') as string;
  }

  /**
   * Who may read a loan's documents: the customer it belongs to, or an employee
   * who can view loans/payments in that loan's branch. A missing loan and
   * someone else's loan look the same to a customer (404), so ids can't be probed.
   */
  private assertCanRead(user: JwtPayloadUser, loan: { customerId: string; branchId: string }) {
    if (user.userType === 'CUSTOMER') {
      if (loan.customerId !== user.customerId) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
      return;
    }
    if (!user.permissions.includes('loan.view') && !user.permissions.includes('payment.view')) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    this.branchScope.assertAccess(user, loan.branchId);
  }

  // =====================================================================
  // RECEIPT
  // =====================================================================

  async receipt(receiptId: string, user: JwtPayloadUser): Promise<RenderedDocument> {
    const r = await this.loadReceipt(receiptId);
    this.assertCanRead(user, r.loan);
    return this.renderReceipt(r);
  }

  private async loadReceipt(receiptId: string) {
    const r = await this.prisma.receipt.findUnique({
      where: { id: receiptId },
      include: {
        loan: { include: { customer: true, branch: true, product: { select: { name: true } } } },
        paymentTransaction: { include: { payment: { select: { paymentNumber: true, mode: true } } } },
      },
    });
    if (!r) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    return r;
  }

  private async renderReceipt(r: Awaited<ReturnType<DocumentsService['loadReceipt']>>): Promise<RenderedDocument> {
    const b = r.loan.branch;
    const c = r.loan.customer;
    const bytes = await renderReceiptPdf({
      receiptNumber: r.receiptNumber,
      issuedAt: r.createdAt,
      paymentNumber: r.paymentTransaction.payment.paymentNumber,
      paymentMode: r.paymentTransaction.payment.mode,
      loanNumber: r.loan.loanNumber,
      productName: r.loan.product.name,
      customerName: [c.firstName, c.lastName].filter(Boolean).join(' '),
      customerCode: c.customerCode,
      customerMobile: c.mobile,
      branchName: b.name,
      branchAddress: [b.addressLine1, b.city, b.state, b.pinCode].filter(Boolean).join(', '),
      branchPhone: b.phone,
      principal: new Decimal(r.principalComponent).toFixed(2),
      interest: new Decimal(r.interestComponent).toFixed(2),
      charges: new Decimal(r.chargesComponent).toFixed(2),
      total: new Decimal(r.totalAmount).toFixed(2),
    });
    return { bytes, filename: `${r.receiptNumber}.pdf` };
  }

  // =====================================================================
  // LOAN STATEMENT
  // =====================================================================

  async statement(loanId: string, user: JwtPayloadUser): Promise<RenderedDocument> {
    // getLoanDetail applies the same ownership / branch rules and brings interest accrual up to date.
    const loan = await this.loansService.getLoanDetail(loanId, user);
    this.assertCanRead(user, loan);

    let balance = new Decimal(0);
    const totals = { disbursed: new Decimal(0), principalPaid: new Decimal(0), interestPaid: new Decimal(0), chargesPaid: new Decimal(0) };
    const lines: StatementLine[] = [];
    // Only money that actually moved appears as a line. Accrual-style entries (interest accrual, penal charges)
    // are part of the "outstanding" figure and only show up here once they are paid.
    const MOVED = new Set(['DISBURSEMENT', 'INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'FEE', 'WAIVER', 'REFUND', 'CLOSURE', 'ADJUSTMENT', 'AUCTION_PROCEEDS']);
    for (const t of loan.financialTransactions) {
      if (!MOVED.has(t.type)) continue;
      const amount = new Decimal(t.amount);
      if (amount.isZero() && t.type !== 'DISBURSEMENT') continue; // a payment leg that applied nothing (e.g. no charges were due)
      switch (t.type) {
        case 'DISBURSEMENT':
          balance = balance.plus(amount);
          totals.disbursed = totals.disbursed.plus(amount);
          break;
        case 'PRINCIPAL_PAYMENT':
          balance = balance.minus(amount);
          totals.principalPaid = totals.principalPaid.plus(amount);
          break;
        case 'ADJUSTMENT':
          // The principal a sale left unrecovered, written off: it reduces the balance but is not a payment.
          if (t.creditAccount === 'LOAN_PRINCIPAL_RECEIVABLE') balance = balance.minus(amount);
          break;
        case 'AUCTION_PROCEEDS':
          // Sale proceeds are applied to what was owed exactly like a repayment; the surplus leg is the
          // borrower's own money, not a repayment.
          if (t.creditAccount === 'LOAN_PRINCIPAL_RECEIVABLE') {
            balance = balance.minus(amount);
            totals.principalPaid = totals.principalPaid.plus(amount);
          } else if (t.creditAccount === 'INTEREST_INCOME') {
            totals.interestPaid = totals.interestPaid.plus(amount);
          } else if (t.creditAccount === 'FEE_INCOME') {
            totals.chargesPaid = totals.chargesPaid.plus(amount);
          }
          break;
        case 'INTEREST_PAYMENT':
          totals.interestPaid = totals.interestPaid.plus(amount);
          break;
        case 'FEE':
          totals.chargesPaid = totals.chargesPaid.plus(amount);
          break;
        default:
          break; // waiver / refund / closure / adjustment: listed for the record, principal balance untouched
      }
      const isSaleApplied = t.type === 'AUCTION_PROCEEDS' && t.creditAccount !== 'CUSTOMER_SURPLUS_PAYABLE';
      lines.push({
        date: t.createdAt,
        description: t.type === 'AUCTION_PROCEEDS' ? AUCTION_LEG_LABEL[t.creditAccount] ?? 'Auction proceeds' : WRITE_OFF_LABEL[`${t.type}:${t.creditAccount}`] ?? TXN_LABEL[t.type] ?? t.type,
        reference: t.reference,
        debit: t.type === 'DISBURSEMENT' ? amount.toFixed(2) : null,
        credit: ['INTEREST_PAYMENT', 'PRINCIPAL_PAYMENT', 'FEE'].includes(t.type) || isSaleApplied ? amount.toFixed(2) : null,
        principalBalance: balance.toFixed(2),
      });
    }

    const c = loan.customer;
    const bytes = await renderStatementPdf({
      generatedAt: new Date(),
      loanNumber: loan.loanNumber,
      status: loan.status,
      productName: loan.product.name,
      customerName: [c.firstName, c.lastName].filter(Boolean).join(' '),
      customerCode: c.customerCode,
      branchName: loan.branch.name,
      principalAmount: new Decimal(loan.principalAmount).toFixed(2),
      interestRate: new Decimal(loan.interestRateSnapshot).toFixed(2),
      ltvPercent: new Decimal(loan.approvedLtvPercent).toFixed(0),
      tenureDays: loan.tenureDays,
      startDate: loan.startDate,
      maturityDate: loan.maturityDate,
      closedAt: loan.closedAt,
      totals: { disbursed: totals.disbursed.toFixed(2), principalPaid: totals.principalPaid.toFixed(2), interestPaid: totals.interestPaid.toFixed(2), chargesPaid: totals.chargesPaid.toFixed(2) },
      outstanding: loan.outstanding,
      lines,
    });
    return { bytes, filename: `Statement-${loan.loanNumber}.pdf` };
  }

  // =====================================================================
  // AUCTION NOTICE
  // =====================================================================

  private async loadAuctionForNotice(auctionId: string) {
    const a = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { loan: { include: { customer: true, branch: true, product: { select: { name: true } } } } },
    });
    if (!a) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    return a;
  }

  /**
   * The borrower may read the notice for their own loan once it has been issued and while it is still live;
   * anything else looks like "not found" to them. Staff need auction.view in the loan's branch.
   */
  private assertCanReadNotice(user: JwtPayloadUser, a: { status: string; noticeSentAt: Date | null; loan: { customerId: string; branchId: string } }) {
    if (user.userType === 'CUSTOMER') {
      if (a.loan.customerId !== user.customerId || !a.noticeSentAt || !NOTICE_LIVE_STATUSES.includes(a.status)) {
        throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
      return;
    }
    if (!user.permissions.includes('auction.view')) throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    this.branchScope.assertAccess(user, a.loan.branchId);
  }

  private async noticeLegalText(): Promise<string> {
    const row = await this.prisma.setting.findFirst({ where: { key: 'AUCTION_NOTICE_LEGAL_TEXT', scope: 'GLOBAL', status: 'ACTIVE' } });
    const text = typeof row?.value === 'string' ? row.value.trim() : '';
    return text.length > 0 && text.length <= 3000 ? text : DEFAULT_NOTICE_LEGAL_TEXT;
  }

  async auctionNotice(auctionId: string, user: JwtPayloadUser): Promise<RenderedDocument> {
    const a = await this.loadAuctionForNotice(auctionId);
    this.assertCanReadNotice(user, a);
    return this.renderAuctionNotice(a);
  }

  private async renderAuctionNotice(a: Awaited<ReturnType<DocumentsService['loadAuctionForNotice']>>): Promise<RenderedDocument> {
    if (!a.noticeSentAt || !a.noticePeriodEndsAt) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, 'The notice has not been sent for this auction yet.');
    }
    if (!NOTICE_LIVE_STATUSES.includes(a.status)) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `This auction is ${a.status.toLowerCase().replace(/_/g, ' ')}, so its notice is no longer current.`);
    }
    // What is owed changes daily, so it is worked out fresh, as of the moment the notice is produced.
    await this.interestEngine.accrueUpToToday(a.loanId);
    const owed = await this.loansService.getOutstandingBreakdown(a.loanId);
    const items = await this.prisma.collateralItem.findMany({
      where: { releasedAt: null, collateral: { loanId: a.loanId, status: { in: ['APPRAISED', 'STORED', 'AUCTION_PROCESS'] } } },
      orderBy: { createdAt: 'asc' },
      select: { itemType: true, netWeight: true, purityKarat: true },
    });
    const b = a.loan.branch;
    const c = a.loan.customer;
    const bytes = await renderAuctionNoticePdf({
      auctionNumber: a.auctionNumber,
      noticeSentAt: a.noticeSentAt,
      noticePeriodEndsAt: a.noticePeriodEndsAt,
      scheduledDate: a.scheduledDate,
      venue: a.venue,
      generatedAt: new Date(),
      loanNumber: a.loan.loanNumber,
      productName: a.loan.product.name,
      customerName: [c.firstName, c.lastName].filter(Boolean).join(' '),
      customerCode: c.customerCode,
      customerMobile: c.mobile,
      branchName: b.name,
      branchAddress: [b.addressLine1, b.city, b.state, b.pinCode].filter(Boolean).join(', '),
      branchPhone: b.phone,
      principal: new Decimal(owed.principal).toFixed(2),
      interest: new Decimal(owed.interest).toFixed(2),
      charges: new Decimal(owed.charges).toFixed(2),
      total: new Decimal(owed.total).toFixed(2),
      items: items.map((i) => ({ itemType: i.itemType, netWeight: new Decimal(i.netWeight).toString(), purityKarat: new Decimal(i.purityKarat).toString() })),
      legalText: await this.noticeLegalText(),
    });
    return { bytes, filename: `Auction-Notice-${a.loan.loanNumber}.pdf` };
  }

  // =====================================================================
  // SIGNED LINKS (for the mobile apps)
  // =====================================================================

  /** Authorises the caller for one document now, and returns a link that works for two minutes without a login header. */
  async createLink(kind: DocumentKind, id: string, user: JwtPayloadUser): Promise<{ path: string; expiresAt: string }> {
    if (kind === 'receipt') {
      const r = await this.loadReceipt(id);
      this.assertCanRead(user, r.loan);
    } else if (kind === 'auction_notice') {
      this.assertCanReadNotice(user, await this.loadAuctionForNotice(id));
    } else {
      const loan = await this.prisma.loan.findUnique({ where: { id }, select: { customerId: true, branchId: true } });
      if (!loan) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
      this.assertCanRead(user, loan);
    }
    const { token, expiresAt } = signDownloadToken({ k: kind, id, sub: user.customerId ?? user.employeeId ?? user.userId }, this.secret);
    return { path: `/documents/download?t=${encodeURIComponent(token)}`, expiresAt: expiresAt.toISOString() };
  }

  /** Redeems a link. The token already proved who asked and for what, so the document is rendered as that same person. */
  async redeem(token: string): Promise<RenderedDocument> {
    const claims = verifyDownloadToken(token, this.secret);
    if (!claims) throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'This download link is invalid or has expired.');
    if (claims.k === 'receipt') return this.renderReceipt(await this.loadReceipt(claims.id));
    if (claims.k === 'auction_notice') return this.renderAuctionNotice(await this.loadAuctionForNotice(claims.id));
    // A statement needs the loan's owner context; render it as that owner/employee-agnostic read.
    const loan = await this.prisma.loan.findUnique({ where: { id: claims.id }, select: { id: true, customerId: true, branchId: true } });
    if (!loan) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    const asSystem: JwtPayloadUser = { userId: claims.sub, userType: 'CUSTOMER', customerId: loan.customerId, permissions: [] };
    return this.statement(loan.id, asSystem);
  }
}
