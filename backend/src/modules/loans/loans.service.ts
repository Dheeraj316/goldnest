import { HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import { InterestEngineService } from '../interest-engine/interest-engine.service';
import { OPEN_AUCTION_STATUSES } from '../../common/utils/auction';
import { ledgerPaid } from '../../common/utils/loan-balance';
import { calculateChargeAmount } from '../../common/utils/interest';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { QueryLoanApplicationsDto } from './dto/query-loan-applications.dto';
import { CreateCollateralDto } from './dto/create-collateral.dto';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { DecideAppraisalDto } from './dto/decide-appraisal.dto';
import { DecideLoanApprovalDto } from './dto/decide-loan-approval.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RenewLoanDto } from './dto/renew-loan.dto';
import { TopUpLoanDto } from './dto/topup-loan.dto';
import { PartReleaseDto } from './dto/part-release.dto';
import { approverRolesFor } from './loan-status.constants';
import { randomUUID } from 'crypto';

const { Decimal } = Prisma;

/** Loan statuses that can take a payment: open loans, and auctioned ones with a shortfall still to recover. */
const PAYABLE_STATUSES: string[] = ['ACTIVE', 'OVERDUE', 'AUCTIONED'];

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly numberGenerator: NumberGeneratorService,
    private readonly interestEngine: InterestEngineService,
  ) {}

  // =====================================================================
  // LOAN APPLICATIONS
  // =====================================================================

  async createApplication(dto: CreateLoanApplicationDto, actor: JwtPayloadUser) {
    const customerId = actor.userType === 'CUSTOMER' ? actor.customerId! : dto.customerId;
    if (!customerId) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'customerId is required.');
    }
    const [product, customer, branch] = await Promise.all([
      this.prisma.loanProduct.findUnique({ where: { id: dto.productId } }),
      this.prisma.customer.findUnique({ where: { id: customerId } }),
      this.prisma.branch.findUnique({ where: { id: dto.branchId } }),
    ]);
    if (!product || !product.isActive) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'This loan product is not available.');
    }
    if (!customer || customer.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Customer not found.');
    }
    if (!branch) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Branch not found.');
    }
    if (dto.requestedAmount < Number(product.minLoanAmount) || dto.requestedAmount > Number(product.maxLoanAmount)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `Requested amount must be between ${product.minLoanAmount} and ${product.maxLoanAmount} for this product.`,
      );
    }
    if (dto.requestedTenureDays < product.minTenureDays || dto.requestedTenureDays > product.maxTenureDays) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `Requested tenure must be between ${product.minTenureDays} and ${product.maxTenureDays} days for this product.`,
      );
    }

    const applicationNumber = await this.numberGenerator.generateApplicationNumber();
    const application = await this.prisma.loanApplication.create({
      data: {
        applicationNumber,
        customerId,
        branchId: dto.branchId,
        productId: dto.productId,
        requestedAmount: dto.requestedAmount,
        requestedTenureDays: dto.requestedTenureDays,
        purpose: dto.purpose,
        createdByEmployeeId: actor.userType === 'EMPLOYEE' ? actor.employeeId : null,
        status: 'SUBMITTED',
      },
      // Same shape as listMyApplications — callers shouldn't have to guess
      // whether product/branch names are present depending on which endpoint
      // they hit.
      include: { product: { select: { name: true, code: true } }, branch: { select: { name: true, code: true } } },
    });
    await this.prisma.loanStatusHistory.create({
      data: { applicationId: application.id, toStatus: 'SUBMITTED', changedBy: actor.employeeId, reason: 'Application submitted' },
    });
    // This is also, today, the first point a customer is ever assigned to a
    // branch (spec Phase-1 gap noted in customers.service.ts) — a customer
    // applying for a loan is a reasonable, real moment to set it.
    if (!customer.branchId) {
      await this.prisma.customer.update({ where: { id: customerId }, data: { branchId: dto.branchId } });
    }
    return application;
  }

  async listMyApplications(customerId: string) {
    return this.prisma.loanApplication.findMany({
      where: { customerId },
      include: { product: { select: { name: true, code: true } }, branch: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listApplications(query: QueryLoanApplicationsDto, user: JwtPayloadUser) {
    const branchFilter = this.branchScope.isCrossBranch(user) ? (query.branchId ? { branchId: query.branchId } : {}) : { branchId: user.branchId };
    const where = { ...branchFilter, ...(query.status ? { status: query.status as never } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.loanApplication.findMany({
        where,
        include: { customer: { select: { firstName: true, lastName: true, mobile: true, customerCode: true } }, product: { select: { name: true, code: true } } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loanApplication.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findApplication(id: string, user: JwtPayloadUser) {
    const application = await this.prisma.loanApplication.findUnique({
      where: { id },
      include: {
        customer: true,
        product: true,
        branch: { select: { id: true, code: true, name: true } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        loan: true,
      },
    });
    if (!application) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (user.userType === 'CUSTOMER') {
      if (application.customerId !== user.customerId) {
        throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    } else {
      this.branchScope.assertAccess(user, application.branchId);
    }
    return application;
  }

  /**
   * Moves an application into appraisal, creating the `Loan` "case file" row
   * that anchors collateral/appraisal/approval — both `Collateral.loanId`
   * and `LoanApproval.loanId` are required columns, so this row must exist
   * before either of those can. `Loan.status` starts at APPRAISAL_PENDING,
   * not the schema's bare default of APPROVED; the default only matters if
   * a caller omits status, which this code never does.
   */
  async startAppraisal(applicationId: string, actor: JwtPayloadUser) {
    const application = await this.prisma.loanApplication.findUnique({ where: { id: applicationId }, include: { customer: true, product: true, branch: true } });
    if (!application) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, application.branchId);
    if (application.status !== 'SUBMITTED') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Application is ${application.status}, expected SUBMITTED.`);
    }
    if (application.customer.kycStatus !== 'VERIFIED') {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, 'Customer KYC must be verified before appraisal can start.');
    }

    const rule = await this.prisma.interestRule.findFirst({
      where: { productId: application.productId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!rule) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, 'This product has no active interest rule configured.');
    }

    const loanNumber = await this.numberGenerator.generateLoanNumber(application.branch.code, 'GL');
    const [loan] = await this.prisma.$transaction([
      this.prisma.loan.create({
        data: {
          loanNumber,
          applicationId: application.id,
          customerId: application.customerId,
          branchId: application.branchId,
          productId: application.productId,
          principalAmount: application.requestedAmount,
          approvedLtvPercent: application.product.maxLtvPercent,
          interestRateSnapshot: rule.annualRatePercent,
          tenureDays: application.requestedTenureDays,
          status: 'APPRAISAL_PENDING',
        },
      }),
      this.prisma.loanApplication.update({ where: { id: applicationId }, data: { status: 'APPRAISAL_PENDING' } }),
    ]);
    await this.prisma.loanStatusHistory.createMany({
      data: [
        { applicationId, toStatus: 'APPRAISAL_PENDING', changedBy: actor.employeeId, reason: 'Appraisal started' },
        { loanId: loan.id, toStatus: 'APPRAISAL_PENDING', changedBy: actor.employeeId, reason: 'Loan case file opened' },
      ],
    });
    return loan;
  }

  // =====================================================================
  // COLLATERAL & APPRAISAL
  // =====================================================================

  async createCollateral(loanId: string, dto: CreateCollateralDto, actor: JwtPayloadUser) {
    const loan = await this.getLoanOrThrow(loanId);
    this.branchScope.assertAccess(actor, loan.branchId);
    if (loan.status !== 'APPRAISAL_PENDING') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, expected APPRAISAL_PENDING.`);
    }
    for (const item of dto.items) {
      const expectedNet = item.grossWeight - (item.stoneWeight ?? 0);
      if (Math.abs(expectedNet - item.netWeight) > 0.001) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, `netWeight must equal grossWeight minus stoneWeight for item "${item.itemType}".`);
      }
    }
    const collateralCode = await this.numberGenerator.generateCollateralCode();
    return this.prisma.collateral.create({
      data: {
        collateralCode,
        loanId,
        customerId: loan.customerId,
        branchId: loan.branchId,
        status: 'PENDING_APPRAISAL',
        items: {
          create: dto.items.map((item) => ({
            itemType: item.itemType,
            description: item.description,
            grossWeight: item.grossWeight,
            stoneWeight: item.stoneWeight ?? 0,
            netWeight: item.netWeight,
            purityKarat: item.purityKarat,
          })),
        },
      },
      include: { items: true },
    });
  }

  async createAppraisal(collateralId: string, dto: CreateAppraisalDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const collateral = await this.prisma.collateral.findUnique({ where: { id: collateralId }, include: { items: true, loan: { include: { product: true } } } });
    if (!collateral) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, collateral.branchId);
    if (collateral.status !== 'PENDING_APPRAISAL') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Collateral is ${collateral.status}, expected PENDING_APPRAISAL.`);
    }
    const itemsById = new Map(collateral.items.map((i) => [i.id, i]));

    let totalValuation = new Decimal(0);
    let totalNetWeight = new Decimal(0);
    const itemRows: { collateralItemId: string; netGoldWeight: Prisma.Decimal; purityKarat: Prisma.Decimal; valuation: Prisma.Decimal }[] = [];
    for (const input of dto.items) {
      const collateralItem = itemsById.get(input.collateralItemId);
      if (!collateralItem) {
        throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, `Collateral item ${input.collateralItemId} does not belong to this collateral.`);
      }
      const netGoldWeight = new Decimal(input.netGoldWeight ?? collateralItem.netWeight);
      const purityKarat = new Decimal(input.purityKarat ?? collateralItem.purityKarat);
      // Fineness-adjusted valuation: net weight is converted to its 24k-gold
      // equivalent by purity before pricing — never priced at the raw net
      // weight, which would overvalue anything below 24k (spec #64).
      const pureGoldEquivalent = netGoldWeight.mul(purityKarat).div(24);
      const valuation = pureGoldEquivalent.mul(dto.goldRatePerGram).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalValuation = totalValuation.plus(valuation);
      totalNetWeight = totalNetWeight.plus(netGoldWeight);
      itemRows.push({ collateralItemId: input.collateralItemId, netGoldWeight, purityKarat, valuation });
    }

    const appliedLtvPercent = new Decimal(collateral.loan.product.maxLtvPercent);
    const eligibleLoanValue = totalValuation.mul(appliedLtvPercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

    return this.prisma.appraisal.create({
      data: {
        collateralId,
        appraiserEmployeeId: actor.employeeId,
        goldRatePerGram: dto.goldRatePerGram,
        totalValuation,
        appliedLtvPercent,
        eligibleLoanValue,
        remarks: dto.remarks,
        requiresCheckerApproval: true,
        status: 'PENDING_CHECK',
        items: { create: itemRows },
      },
      include: { items: true },
    });
  }

  async decideAppraisal(appraisalId: string, dto: DecideAppraisalDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const appraisal = await this.prisma.appraisal.findUnique({ where: { id: appraisalId }, include: { collateral: { include: { items: true, loan: true } } } });
    if (!appraisal) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, appraisal.collateral.branchId);
    if (appraisal.status !== 'PENDING_CHECK') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Appraisal is ${appraisal.status}, expected PENDING_CHECK.`);
    }
    if (appraisal.appraiserEmployeeId === actor.employeeId) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN, 'The appraiser cannot check their own appraisal.');
    }

    const updated = await this.prisma.appraisal.update({
      where: { id: appraisalId },
      data: { status: dto.decision, checkedBy: actor.employeeId, checkedAt: new Date(), remarks: dto.remarks ?? appraisal.remarks },
    });

    if (dto.decision === 'APPROVED') {
      const totalGrossWeight = appraisal.collateral.items.reduce((sum, i) => sum.plus(i.grossWeight), new Decimal(0));
      const netWeightAgg = await this.prisma.appraisalItem.aggregate({ where: { appraisalId }, _sum: { netGoldWeight: true } });
      await this.prisma.collateral.update({
        where: { id: appraisal.collateralId },
        data: {
          status: 'APPRAISED',
          totalGrossWeight,
          totalNetWeight: netWeightAgg._sum.netGoldWeight ?? 0,
          totalEligibleValue: appraisal.eligibleLoanValue,
        },
      });

      await this.prisma.loan.update({ where: { id: appraisal.collateral.loanId }, data: { status: 'APPROVAL_PENDING', approvedLtvPercent: appraisal.appliedLtvPercent } });
      await this.prisma.loanStatusHistory.create({
        data: { loanId: appraisal.collateral.loanId, toStatus: 'APPROVAL_PENDING', changedBy: actor.employeeId, reason: 'Appraisal approved' },
      });
    }
    return updated;
  }

  // =====================================================================
  // LOAN APPROVAL
  // =====================================================================

  async decideLoanApproval(loanId: string, dto: DecideLoanApprovalDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: { application: true, collaterals: { include: { appraisals: { where: { status: 'APPROVED' }, orderBy: { createdAt: 'desc' }, take: 1 } } } },
    });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    if (loan.status !== 'APPROVAL_PENDING') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, expected APPROVAL_PENDING.`);
    }
    if (loan.application.createdByEmployeeId && loan.application.createdByEmployeeId === actor.employeeId) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN, 'You cannot approve a loan application you created.');
    }
    const requestedAmount = Number(loan.principalAmount);
    const allowedRoles = approverRolesFor(requestedAmount);
    if (!actor.roleCode || !allowedRoles.includes(actor.roleCode)) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, `A loan of this amount requires approval from: ${allowedRoles.join(', ')}.`);
    }

    const approvedEligible = loan.collaterals.flatMap((c) => c.appraisals)[0]?.eligibleLoanValue;
    if (!approvedEligible) {
      throw new AppException(ErrorCode.APPROVAL_REQUIRED, HttpStatus.CONFLICT, 'No approved appraisal found for this loan.');
    }
    const cappedAmount = Math.min(dto.approvedAmount ?? Number(approvedEligible), Number(approvedEligible), requestedAmount);

    await this.prisma.loanApproval.create({
      data: {
        loanId,
        approvalLevel: 1,
        approverEmployeeId: actor.employeeId,
        decision: dto.decision,
        approvedAmount: dto.decision === 'APPROVED' ? cappedAmount : null,
        remarks: dto.remarks,
      },
    });

    if (dto.decision === 'APPROVED') {
      const updated = await this.prisma.loan.update({ where: { id: loanId }, data: { status: 'APPROVED', principalAmount: cappedAmount } });
      await this.prisma.loanApplication.update({ where: { id: loan.applicationId }, data: { status: 'APPROVED' } });
      await this.prisma.loanStatusHistory.create({ data: { loanId, toStatus: 'APPROVED', changedBy: actor.employeeId, reason: dto.remarks } });
      return updated;
    }
    if (dto.decision === 'REJECTED') {
      const updated = await this.prisma.loan.update({ where: { id: loanId }, data: { status: 'REJECTED' } });
      await this.prisma.loanApplication.update({ where: { id: loan.applicationId }, data: { status: 'REJECTED' } });
      await this.prisma.loanStatusHistory.create({ data: { loanId, toStatus: 'REJECTED', changedBy: actor.employeeId, reason: dto.remarks } });
      return updated;
    }
    // REFERRED: stays APPROVAL_PENDING for a higher tier / more information — no status change.
    return loan;
  }

  // =====================================================================
  // DISBURSEMENT
  // =====================================================================

  async disburse(loanId: string, actor: JwtPayloadUser) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId }, include: { customer: true, product: { include: { charges: { where: { isActive: true } } } } } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    if (loan.status !== 'APPROVED') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, expected APPROVED.`);
    }
    if (loan.customer.kycStatus !== 'VERIFIED') {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, 'Customer KYC must be verified before disbursement.');
    }

    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const maturityDate = new Date(startDate.getTime() + loan.tenureDays * 86_400_000);

    return this.prisma.$transaction(async (tx) => {
      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: { status: 'ACTIVE', disbursedAt: now, startDate, maturityDate },
      });
      await tx.loanApplication.update({ where: { id: loan.applicationId }, data: { status: 'ACTIVE' } });
      await tx.loanStatusHistory.create({ data: { loanId, toStatus: 'ACTIVE', changedBy: actor.employeeId, reason: 'Disbursed' } });

      const disbursementTxn = await tx.financialTransaction.create({
        data: {
          loanId,
          customerId: loan.customerId,
          branchId: loan.branchId,
          type: 'DISBURSEMENT',
          amount: loan.principalAmount,
          debitAccount: 'LOAN_PRINCIPAL_RECEIVABLE',
          creditAccount: 'CASH',
          reference: loan.loanNumber,
          idempotencyKey: `DISB-${loanId}`,
          createdBy: actor.employeeId,
          approvedBy: actor.employeeId,
        },
      });
      await tx.ledgerEntry.createMany({
        data: [
          { transactionId: disbursementTxn.id, account: 'LOAN_PRINCIPAL_RECEIVABLE', debit: loan.principalAmount, credit: 0 },
          { transactionId: disbursementTxn.id, account: 'CASH', debit: 0, credit: loan.principalAmount },
        ],
      });

      // Charges become amounts the customer owes (LoanCharge), collected via
      // a later payment — not netted off the disbursed cash in Phase B, to
      // keep the disbursement ledger line auditable as exactly the
      // principal amount.
      for (const charge of loan.product.charges) {
        const chargeAmount = calculateChargeAmount(charge.calcType as 'FLAT' | 'PERCENT_OF_PRINCIPAL', charge.amount, loan.principalAmount);
        if (chargeAmount.lte(0)) continue;
        await tx.loanCharge.create({ data: { loanId, chargeId: charge.id, amount: chargeAmount } });
      }

      return updatedLoan;
    });
  }

  // =====================================================================
  // PAYMENTS
  // =====================================================================

  async recordPayment(loanId: string, dto: RecordPaymentDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    // An auctioned loan still takes payments: whatever the sale did not cover is still owed, and recovering it
    // goes through this same path (interest, then charges, then principal) with an ordinary receipt.
    if (!PAYABLE_STATUSES.includes(loan.status)) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, cannot accept a payment.`);
    }

    const idempotencyKey = dto.idempotencyKey || `MANUAL-${loanId}-${randomUUID()}`;
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    if (existing) {
      throw new AppException(ErrorCode.IDEMPOTENCY_CONFLICT, HttpStatus.CONFLICT, 'This payment was already recorded.');
    }

    await this.interestEngine.accrueUpToToday(loanId);

    const [interestOutstanding, chargesOutstanding, principalOutstanding] = await Promise.all([
      this.interestEngine.interestOutstanding(loanId),
      this.chargesOutstanding(loanId),
      this.interestEngine.outstandingPrincipal(loanId, new Date()),
    ]);

    let remaining = new Decimal(dto.amount);
    const toInterest = Decimal.min(remaining, Decimal.max(interestOutstanding, 0));
    remaining = remaining.minus(toInterest);
    const toCharges = Decimal.min(remaining, Decimal.max(chargesOutstanding, 0));
    remaining = remaining.minus(toCharges);
    const toPrincipal = Decimal.min(remaining, Decimal.max(principalOutstanding, 0));
    remaining = remaining.minus(toPrincipal);
    // Any leftover beyond what's actually owed is rejected rather than
    // silently accepted as an overpayment sitting nowhere in the ledger —
    // an explicit "advance payment" feature is a future-phase decision, not
    // a default (spec #194: never silently create unaccounted-for money).
    if (remaining.gt(0.01)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, `Amount exceeds total outstanding by ${remaining.toFixed(2)}.`);
    }

    const paymentNumber = await this.numberGenerator.generatePaymentNumber();
    const receiptNumber = await this.numberGenerator.generateReceiptNumber();

    return this.prisma.$transaction(async (tx) => {
      // Serialise with an auction sale (or a closure) on the same loan: if the gold was sold while this
      // payment was being worked out, it is refused rather than posted against an auctioned loan.
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId}::uuid FOR UPDATE`;
      const locked = await tx.loan.findUniqueOrThrow({ where: { id: loanId }, select: { status: true } });
      if (!PAYABLE_STATUSES.includes(locked.status)) {
        throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${locked.status}, cannot accept a payment.`);
      }
      const payment = await tx.payment.create({
        data: { paymentNumber, loanId, customerId: loan.customerId, amount: dto.amount, mode: dto.mode, status: 'SUCCESS', idempotencyKey },
      });
      const paymentTxn = await tx.paymentTransaction.create({
        data: { paymentId: payment.id, loanId, customerId: loan.customerId, gateway: 'MANUAL', status: 'SUCCESS', verifiedAt: new Date() },
      });

      const postLeg = (type: 'INTEREST_PAYMENT' | 'FEE' | 'PRINCIPAL_PAYMENT', amount: Prisma.Decimal, debitAccount: string, creditAccount: string) =>
        this.postFinancialLeg(tx, {
          loanId,
          customerId: loan.customerId,
          branchId: loan.branchId,
          type,
          amount,
          debitAccount,
          creditAccount,
          reference: paymentNumber,
          idempotencyKey: `${idempotencyKey}-${type}`,
          createdBy: actor.employeeId,
        });
      await postLeg('INTEREST_PAYMENT', toInterest, 'CASH', 'INTEREST_INCOME');
      await postLeg('FEE', toCharges, 'CASH', 'FEE_INCOME');
      await postLeg('PRINCIPAL_PAYMENT', toPrincipal, 'CASH', 'LOAN_PRINCIPAL_RECEIVABLE');

      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          loanId,
          paymentTransactionId: paymentTxn.id,
          principalComponent: toPrincipal,
          interestComponent: toInterest,
          chargesComponent: toCharges,
          totalAmount: toPrincipal.plus(toInterest).plus(toCharges),
        },
      });

      return { payment, receipt, applied: { interest: toInterest.toFixed(2), charges: toCharges.toFixed(2), principal: toPrincipal.toFixed(2) } };
    });
  }

  /** Posts one balanced Dr/Cr financial-transaction leg — shared by payments, renewals and auctions so they never drift apart. */
  async postFinancialLeg(
    tx: Prisma.TransactionClient,
    params: {
      loanId: string;
      customerId: string;
      branchId: string;
      type: 'DISBURSEMENT' | 'INTEREST_PAYMENT' | 'FEE' | 'PRINCIPAL_PAYMENT' | 'AUCTION_PROCEEDS' | 'REFUND' | 'ADJUSTMENT' | 'WAIVER';
      amount: Prisma.Decimal;
      debitAccount: string;
      creditAccount: string;
      reference: string;
      idempotencyKey: string;
      createdBy?: string;
    },
  ) {
    if (params.amount.lte(0)) return;
    const txn = await tx.financialTransaction.create({
      data: {
        loanId: params.loanId,
        customerId: params.customerId,
        branchId: params.branchId,
        type: params.type,
        amount: params.amount,
        debitAccount: params.debitAccount,
        creditAccount: params.creditAccount,
        reference: params.reference,
        idempotencyKey: params.idempotencyKey,
        createdBy: params.createdBy,
      },
    });
    await tx.ledgerEntry.createMany({
      data: [
        { transactionId: txn.id, account: params.debitAccount, debit: params.amount, credit: 0 },
        { transactionId: txn.id, account: params.creditAccount, debit: 0, credit: params.amount },
      ],
    });
  }

  // =====================================================================
  // RENEWAL
  // =====================================================================

  /**
   * Settles whatever interest/charges have accrued (never principal — that's
   * what distinguishes a renewal from a closure) and rolls the loan into a
   * fresh term under a brand-new Loan row, so each loan's financial
   * transactions stay cleanly scoped to the term they belong to instead of
   * mixing two terms' interest history under one loanId. The pledged
   * collateral is re-pointed to the new loan, never released (spec #47).
   */
  async renewLoan(loanId: string, dto: RenewLoanDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, cannot be renewed.`);
    }
    await this.assertNoOpenAuction(loanId, 'renewed');

    await this.interestEngine.accrueUpToToday(loanId);
    const [interestOutstanding, chargesOutstanding, principalOutstanding] = await Promise.all([
      this.interestEngine.interestOutstanding(loanId),
      this.chargesOutstanding(loanId),
      this.interestEngine.outstandingPrincipal(loanId, new Date()),
    ]);

    const owedBeforeRollover = Decimal.max(interestOutstanding, 0).plus(Decimal.max(chargesOutstanding, 0));
    const paymentAmount = new Decimal(dto.paymentAmount);
    if (paymentAmount.lt(owedBeforeRollover)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `Renewal requires settling outstanding interest and charges of ${owedBeforeRollover.toFixed(2)} first.`,
      );
    }
    const toInterest = Decimal.max(interestOutstanding, 0);
    const toCharges = Decimal.max(chargesOutstanding, 0);
    // Any amount paid beyond interest+charges is a voluntary principal
    // reduction rolled into the new loan at a lower balance — never silently
    // dropped, and never allowed to pay the loan off entirely (that's what
    // closeLoan is for, which also releases the collateral).
    const principalReduction = paymentAmount.minus(owedBeforeRollover);
    const newPrincipal = principalOutstanding.minus(principalReduction);
    if (newPrincipal.lte(0.01)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'This payment would fully settle the principal — use loan closure instead of renewal.',
      );
    }

    const product = await this.prisma.loanProduct.findUniqueOrThrow({ where: { id: loan.productId } });
    const rule = await this.prisma.interestRule.findFirst({
      where: { productId: loan.productId, effectiveTo: null },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!rule) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, 'This product has no active interest rule configured.');
    }
    const newTenureDays = dto.newTenureDays ?? loan.tenureDays;
    if (newTenureDays < product.minTenureDays || newTenureDays > product.maxTenureDays) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `Tenure must be between ${product.minTenureDays} and ${product.maxTenureDays} days for this product.`,
      );
    }

    const idempotencyKey = `RENEWAL-${loanId}-${randomUUID()}`;
    const paymentNumber = await this.numberGenerator.generatePaymentNumber();
    const receiptNumber = await this.numberGenerator.generateReceiptNumber();
    const newApplicationNumber = await this.numberGenerator.generateApplicationNumber();
    const branch = await this.prisma.branch.findUniqueOrThrow({ where: { id: loan.branchId } });
    const newLoanNumber = await this.numberGenerator.generateLoanNumber(branch.code, 'GL');

    const now = new Date();
    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const maturityDate = new Date(startDate.getTime() + newTenureDays * 86_400_000);

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: { paymentNumber, loanId, customerId: loan.customerId, amount: paymentAmount, mode: dto.paymentMode, status: 'SUCCESS', idempotencyKey },
      });
      const paymentTxn = await tx.paymentTransaction.create({
        data: { paymentId: payment.id, loanId, customerId: loan.customerId, gateway: 'MANUAL', status: 'SUCCESS', verifiedAt: now },
      });

      const postLeg = (type: 'INTEREST_PAYMENT' | 'FEE' | 'PRINCIPAL_PAYMENT', amount: Prisma.Decimal, debitAccount: string, creditAccount: string) =>
        this.postFinancialLeg(tx, {
          loanId,
          customerId: loan.customerId,
          branchId: loan.branchId,
          type,
          amount,
          debitAccount,
          creditAccount,
          reference: paymentNumber,
          idempotencyKey: `${idempotencyKey}-${type}`,
          createdBy: actor.employeeId,
        });
      await postLeg('INTEREST_PAYMENT', toInterest, 'CASH', 'INTEREST_INCOME');
      await postLeg('FEE', toCharges, 'CASH', 'FEE_INCOME');
      await postLeg('PRINCIPAL_PAYMENT', principalReduction, 'CASH', 'LOAN_PRINCIPAL_RECEIVABLE');

      const receipt = await tx.receipt.create({
        data: {
          receiptNumber,
          loanId,
          paymentTransactionId: paymentTxn.id,
          principalComponent: principalReduction,
          interestComponent: toInterest,
          chargesComponent: toCharges,
          totalAmount: paymentAmount,
        },
      });

      const closedOldLoan = await tx.loan.update({ where: { id: loanId }, data: { status: 'RENEWED', closedAt: now } });
      await tx.loanApplication.update({ where: { id: loan.applicationId }, data: { status: 'RENEWED' } });

      const newApplication = await tx.loanApplication.create({
        data: {
          applicationNumber: newApplicationNumber,
          customerId: loan.customerId,
          branchId: loan.branchId,
          productId: loan.productId,
          requestedAmount: newPrincipal,
          requestedTenureDays: newTenureDays,
          purpose: `Renewal of ${loan.loanNumber}`,
          createdByEmployeeId: actor.employeeId,
          status: 'ACTIVE',
        },
      });
      const newLoan = await tx.loan.create({
        data: {
          loanNumber: newLoanNumber,
          applicationId: newApplication.id,
          customerId: loan.customerId,
          branchId: loan.branchId,
          productId: loan.productId,
          principalAmount: newPrincipal,
          approvedLtvPercent: loan.approvedLtvPercent,
          interestRateSnapshot: rule.annualRatePercent,
          tenureDays: newTenureDays,
          status: 'ACTIVE',
          disbursedAt: now,
          startDate,
          maturityDate,
        },
      });

      await tx.loanStatusHistory.createMany({
        data: [
          { loanId, toStatus: 'RENEWED', changedBy: actor.employeeId, reason: dto.remarks || `Renewed into ${newLoanNumber}` },
          { loanId: newLoan.id, toStatus: 'ACTIVE', changedBy: actor.employeeId, reason: `Renewed from ${loan.loanNumber}` },
        ],
      });

      // Re-pledge the same collateral under the new loan — nothing physically
      // moves, so this is a re-pointing + audit note, not a release/movement
      // between vault locations.
      const movedCollaterals = await tx.collateral.findMany({ where: { loanId, status: { in: ['PENDING_APPRAISAL', 'APPRAISED', 'STORED'] } } });
      for (const collateral of movedCollaterals) {
        await tx.collateral.update({ where: { id: collateral.id }, data: { loanId: newLoan.id } });
        await tx.collateralMovement.create({
          data: {
            collateralId: collateral.id,
            employeeId: actor.employeeId!,
            reason: `Re-pledged under renewal — moved from loan ${loan.loanNumber} to ${newLoanNumber}`,
            authorizedBy: actor.employeeId,
            occurredAt: now,
          },
        });
      }

      return {
        oldLoan: closedOldLoan,
        newLoan,
        receipt,
        applied: { interest: toInterest.toFixed(2), charges: toCharges.toFixed(2), principalReduction: principalReduction.toFixed(2) },
      };
    });
  }

  // =====================================================================
  // TOP-UP
  // =====================================================================

  /**
   * Re-values the existing pledge at today's gold rate and disburses the
   * gap between the newly eligible amount and what's currently outstanding
   * — same loan, same collateral, no new appraisal-approval or loan-approval
   * cycle (spec #48: "never allow automatic credit limit increase without
   * required consent/approval" is satisfied here by gating the whole action
   * behind loan.topup, a senior-role-only permission, rather than bolting on
   * a redundant checker step on top of an already-restricted action).
   */
  async topUpLoan(loanId: string, dto: TopUpLoanDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, cannot be topped up.`);
    }
    await this.assertNoOpenAuction(loanId, 'topped up');

    const collaterals = await this.prisma.collateral.findMany({
      where: { loanId, status: { in: ['PENDING_APPRAISAL', 'APPRAISED', 'STORED'] } },
      include: { items: { where: { releasedAt: null } } },
    });
    const items = collaterals.flatMap((c) => c.items);
    if (items.length === 0) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, 'This loan has no pledged gold to re-value.');
    }

    await this.interestEngine.accrueUpToToday(loanId);
    const outstandingPrincipal = await this.interestEngine.outstandingPrincipal(loanId, new Date());

    const goldRatePerGram = new Decimal(dto.goldRatePerGram);
    const appraisalItemRows: { collateralItemId: string; netGoldWeight: Prisma.Decimal; purityKarat: Prisma.Decimal; valuation: Prisma.Decimal }[] = [];
    let totalValuation = new Decimal(0);
    for (const item of items) {
      // Same fineness-adjusted formula as the original appraisal (spec #64):
      // net weight converted to its 24k-gold equivalent by purity before
      // pricing.
      const valuation = new Decimal(item.netWeight).mul(item.purityKarat).div(24).mul(goldRatePerGram).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      totalValuation = totalValuation.plus(valuation);
      appraisalItemRows.push({ collateralItemId: item.id, netGoldWeight: new Decimal(item.netWeight), purityKarat: new Decimal(item.purityKarat), valuation });
    }

    const newEligibleValue = totalValuation.mul(loan.approvedLtvPercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    const maxTopUp = newEligibleValue.minus(outstandingPrincipal);
    if (maxTopUp.lte(0)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.CONFLICT,
        `No top-up eligibility at this rate — re-valued pledge supports ${newEligibleValue.toFixed(2)}, already outstanding ${outstandingPrincipal.toFixed(2)}.`,
      );
    }
    const topUpAmount = dto.requestedAmount != null ? Decimal.min(new Decimal(dto.requestedAmount), maxTopUp) : maxTopUp;
    if (topUpAmount.lte(0)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'Requested top-up amount must be greater than zero.');
    }

    const product = await this.prisma.loanProduct.findUniqueOrThrow({ where: { id: loan.productId } });
    const principalAfterTopUp = outstandingPrincipal.plus(topUpAmount);
    if (principalAfterTopUp.gt(product.maxLoanAmount)) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `Total principal after top-up (${principalAfterTopUp.toFixed(2)}) would exceed this product's maximum of ${product.maxLoanAmount}.`,
      );
    }

    const collateralForAppraisal = collaterals[0];
    const idempotencyKey = `TOPUP-${loanId}-${randomUUID()}`;

    return this.prisma.$transaction(async (tx) => {
      // Snapshot the re-valuation as a real Appraisal row — same audit model
      // as the original appraisal, so "what rate/value justified this
      // top-up" is always reconstructable later, not just implied by the
      // resulting principal change.
      const appraisal = await tx.appraisal.create({
        data: {
          collateralId: collateralForAppraisal.id,
          appraiserEmployeeId: actor.employeeId!,
          goldRatePerGram,
          totalValuation,
          appliedLtvPercent: loan.approvedLtvPercent,
          eligibleLoanValue: newEligibleValue,
          remarks: dto.remarks || `Top-up re-valuation — +${topUpAmount.toFixed(2)}`,
          requiresCheckerApproval: false,
          checkedBy: actor.employeeId,
          checkedAt: new Date(),
          status: 'APPROVED',
          items: { create: appraisalItemRows },
        },
      });

      const updatedLoan = await tx.loan.update({
        where: { id: loanId },
        data: { principalAmount: new Decimal(loan.principalAmount).plus(topUpAmount) },
      });

      await this.postFinancialLeg(tx, {
        loanId,
        customerId: loan.customerId,
        branchId: loan.branchId,
        type: 'DISBURSEMENT',
        amount: topUpAmount,
        debitAccount: 'LOAN_PRINCIPAL_RECEIVABLE',
        creditAccount: 'CASH',
        reference: loan.loanNumber,
        idempotencyKey,
        createdBy: actor.employeeId,
      });

      await tx.loanStatusHistory.create({
        data: { loanId, toStatus: updatedLoan.status, changedBy: actor.employeeId, reason: dto.remarks || `Topped up by ${topUpAmount.toFixed(2)} at ₹${goldRatePerGram.toFixed(2)}/g` },
      });

      return { loan: updatedLoan, appraisal, topUpAmount: topUpAmount.toFixed(2), newEligibleValue: newEligibleValue.toFixed(2) };
    });
  }

  // =====================================================================
  // PART-RELEASE — hand some pledged items back while the loan stays open
  // =====================================================================

  /**
   * Releases selected items to the customer only if the gold that STAYS
   * pledged, re-valued at today's rate, still supports the outstanding
   * principal at the loan's approved LTV — i.e. the loan never becomes
   * under-secured as a side effect. Releasing everything is a closure, not a
   * part-release. Restricted to a senior-only permission (loan.partrelease),
   * which is the approval control, same reasoning as top-up.
   *
   * The loan row is locked for the whole check-and-release so two concurrent
   * part-releases can't each see the other's items as "still remaining".
   */
  async partReleaseCollateral(loanId: string, dto: PartReleaseDto, actor: JwtPayloadUser) {
    if (actor.userType !== 'EMPLOYEE' || !actor.employeeId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    const employeeId = actor.employeeId;
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, gold cannot be part-released.`);
    }
    await this.assertNoOpenAuction(loanId, 'part-released');

    await this.interestEngine.accrueUpToToday(loanId);
    const outstandingPrincipal = await this.interestEngine.outstandingPrincipal(loanId, new Date());
    const goldRatePerGram = new Decimal(dto.goldRatePerGram);
    const requestedIds = new Set(dto.itemIds);

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId}::uuid FOR UPDATE`;

      const collaterals = await tx.collateral.findMany({
        where: { loanId, status: { in: ['PENDING_APPRAISAL', 'APPRAISED', 'STORED'] } },
        include: { items: { where: { releasedAt: null } } },
      });
      const pledged = collaterals.flatMap((c) => c.items.map((item) => ({ item, collateralId: c.id })));
      const toRelease = pledged.filter((p) => requestedIds.has(p.item.id));
      if (toRelease.length !== requestedIds.size) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          HttpStatus.BAD_REQUEST,
          'One or more items are not currently pledged against this loan (unknown, belonging to another loan, or already released).',
        );
      }
      const remaining = pledged.filter((p) => !requestedIds.has(p.item.id));
      if (remaining.length === 0) {
        throw new AppException(
          ErrorCode.INVALID_STATE_TRANSITION,
          HttpStatus.CONFLICT,
          'Releasing every pledged item is a loan closure — settle the balance and close the loan instead.',
        );
      }

      // Same fineness-adjusted formula as appraisal and top-up.
      const remainingValuation = remaining.reduce(
        (sum, { item }) =>
          sum.plus(new Decimal(item.netWeight).mul(item.purityKarat).div(24).mul(goldRatePerGram).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)),
        new Decimal(0),
      );
      const remainingEligible = remainingValuation.mul(loan.approvedLtvPercent).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      if (remainingEligible.lt(outstandingPrincipal)) {
        throw new AppException(
          ErrorCode.VALIDATION_FAILED,
          HttpStatus.CONFLICT,
          `The gold that would stay pledged supports ₹${remainingEligible.toFixed(2)} at ₹${goldRatePerGram.toFixed(2)}/g and ${loan.approvedLtvPercent}% LTV, but ₹${outstandingPrincipal.toFixed(2)} principal is outstanding — releasing these items would leave the loan under-secured. Pay down principal first, or release fewer items.`,
        );
      }

      const now = new Date();
      await tx.collateralItem.updateMany({
        where: { id: { in: [...requestedIds] }, releasedAt: null },
        data: { releasedAt: now, releasedBy: employeeId },
      });

      const releasedNetWeight = toRelease.reduce((s, { item }) => s.plus(item.netWeight), new Decimal(0));
      const perCollateral = new Map<string, number>();
      toRelease.forEach(({ collateralId }) => perCollateral.set(collateralId, (perCollateral.get(collateralId) ?? 0) + 1));
      for (const [collateralId, count] of perCollateral) {
        await tx.collateralMovement.create({
          data: {
            collateralId,
            employeeId,
            authorizedBy: employeeId,
            toLocation: 'CUSTOMER',
            reason: `Part-release of ${count} item(s) handed back to the customer; the remaining pledge, re-valued at ₹${goldRatePerGram.toFixed(2)}/g, supports ₹${remainingEligible.toFixed(2)} against ₹${outstandingPrincipal.toFixed(2)} principal outstanding.`,
          },
        });
      }
      await tx.loanStatusHistory.create({
        data: {
          loanId,
          toStatus: loan.status,
          changedBy: employeeId,
          reason: dto.remarks || `Part-released ${toRelease.length} item(s), ${releasedNetWeight.toFixed(3)}g net`,
        },
      });

      return {
        releasedItemIds: toRelease.map((p) => p.item.id),
        releasedNetWeight: releasedNetWeight.toFixed(3),
        remainingItemCount: remaining.length,
        remainingEligibleValue: remainingEligible.toFixed(2),
        outstandingPrincipal: outstandingPrincipal.toFixed(2),
      };
    });
  }

  /**
   * A loan with an auction in progress cannot be renewed, topped up or have gold released — the gold is
   * earmarked for sale. The auction has to be cancelled first, on purpose and with a reason.
   */
  private async assertNoOpenAuction(loanId: string, doing: string) {
    const open = await this.prisma.auction.findFirst({ where: { loanId, status: { in: [...OPEN_AUCTION_STATUSES] } }, select: { auctionNumber: true } });
    if (open) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Auction ${open.auctionNumber} is in progress on this loan, so it cannot be ${doing}. Cancel the auction first.`);
    }
  }

  /**
   * Redemption: the borrower has paid everything before the gold was sold, so any auction in progress is
   * called off and the gold goes back to being ordinary pledged security (which closure then releases).
   */
  private async cancelAuctionsOnRedemption(loanId: string, actor: JwtPayloadUser) {
    const open = await this.prisma.auction.count({ where: { loanId, status: { in: [...OPEN_AUCTION_STATUSES] } } });
    if (open === 0) return;
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId}::uuid FOR UPDATE`;
      await tx.auction.updateMany({
        where: { loanId, status: { in: [...OPEN_AUCTION_STATUSES] } },
        data: { status: 'CANCELLED', cancelledBy: actor.employeeId, cancelledAt: new Date(), cancelReason: 'Loan redeemed — the borrower settled everything before the sale.' },
      });
      await tx.collateral.updateMany({ where: { loanId, status: 'AUCTION_PROCESS' }, data: { status: 'APPRAISED' } });
    });
  }

  private async chargesOutstanding(loanId: string): Promise<Prisma.Decimal> {
    const [charges, paid] = await Promise.all([
      this.prisma.loanCharge.aggregate({ where: { loanId, waived: false }, _sum: { amount: true } }),
      ledgerPaid(this.prisma, loanId),
    ]);
    return new Decimal(charges._sum.amount ?? 0).minus(paid.charges);
  }

  // =====================================================================
  // CLOSURE
  // =====================================================================

  async closeLoan(loanId: string, actor: JwtPayloadUser) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(actor, loan.branchId);
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, `Loan is ${loan.status}, cannot be closed.`);
    }
    await this.interestEngine.accrueUpToToday(loanId);
    const outstanding = await this.getOutstandingBreakdown(loanId);
    if (outstanding.total.gt(0.01)) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, `Loan is not fully settled — outstanding: ${outstanding.total.toFixed(2)}.`);
    }

    // Done first, so a failure leaves an ordinary open loan that can simply be closed again.
    await this.cancelAuctionsOnRedemption(loanId, actor);
    const updated = await this.prisma.loan.update({ where: { id: loanId }, data: { status: 'CLOSED', closedAt: new Date() } });
    await this.prisma.loanApplication.update({ where: { id: loan.applicationId }, data: { status: 'CLOSED' } });
    await this.prisma.loanStatusHistory.create({ data: { loanId, toStatus: 'CLOSED', changedBy: actor.employeeId, reason: 'Fully settled' } });
    await this.releaseCollateral(loanId, actor);
    return updated;
  }

  /**
   * Once a loan is fully settled there's no lien left on the pledged gold —
   * release every non-auctioned collateral for it back to the customer and
   * log the handover, mirroring the same audit-trail pattern as every other
   * loan-state change (spec #50: closure implies release, never a silent
   * status flip with no record of who handed the gold back).
   */
  private async releaseCollateral(loanId: string, actor: JwtPayloadUser) {
    const collaterals = await this.prisma.collateral.findMany({
      where: { loanId, status: { in: ['PENDING_APPRAISAL', 'APPRAISED', 'STORED'] } },
    });
    const now = new Date();
    for (const collateral of collaterals) {
      await this.prisma.collateral.update({ where: { id: collateral.id }, data: { status: 'RELEASED', releasedAt: now } });
      await this.prisma.collateralMovement.create({
        data: {
          collateralId: collateral.id,
          employeeId: actor.employeeId!,
          fromLocation: 'VAULT',
          toLocation: 'CUSTOMER',
          reason: 'Loan closed — fully settled, gold released to customer',
          authorizedBy: actor.employeeId,
          occurredAt: now,
        },
      });
    }
  }

  async getOutstandingBreakdown(loanId: string) {
    const [principal, interest, charges] = await Promise.all([
      this.interestEngine.outstandingPrincipal(loanId, new Date()),
      this.interestEngine.interestOutstanding(loanId),
      this.chargesOutstanding(loanId),
    ]);
    const total = Decimal.max(principal, 0).plus(Decimal.max(interest, 0)).plus(Decimal.max(charges, 0));
    return { principal, interest, charges, total };
  }

  // =====================================================================
  // READ
  // =====================================================================

  async listMyLoans(customerId: string) {
    return this.prisma.loan.findMany({
      where: { customerId },
      include: { product: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listLoans(query: QueryLoanApplicationsDto, user: JwtPayloadUser) {
    const branchFilter = this.branchScope.isCrossBranch(user) ? (query.branchId ? { branchId: query.branchId } : {}) : { branchId: user.branchId };
    const where = { ...branchFilter, ...(query.status ? { status: query.status as never } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.loan.findMany({
        where,
        include: { customer: { select: { firstName: true, lastName: true, mobile: true, customerCode: true } }, product: { select: { name: true } } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loan.count({ where }),
    ]);
    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async getLoanDetail(loanId: string, user: JwtPayloadUser) {
    const loan = await this.getLoanOrThrow(loanId);
    if (user.userType === 'CUSTOMER') {
      if (loan.customerId !== user.customerId) {
        throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
      }
    } else {
      this.branchScope.assertAccess(user, loan.branchId);
    }
    await this.interestEngine.accrueUpToToday(loanId);

    const [full, outstanding] = await Promise.all([
      this.prisma.loan.findUniqueOrThrow({
        where: { id: loanId },
        include: {
          customer: { select: { firstName: true, lastName: true, mobile: true, customerCode: true } },
          product: true,
          branch: { select: { id: true, code: true, name: true } },
          statusHistory: { orderBy: { changedAt: 'asc' } },
          approvals: { include: { approver: { select: { firstName: true, lastName: true } } } },
          collaterals: {
            include: {
              // Handed-back items are history, not pledge — they live on in `movements`.
              items: { where: { releasedAt: null } },
              appraisals: { include: { items: true } },
              // Shared with the customer app, so no employee ids here.
              movements: { orderBy: { occurredAt: 'asc' }, select: { id: true, occurredAt: true, reason: true } },
            },
          },
          loanCharges: { include: { charge: true } },
          financialTransactions: { orderBy: { createdAt: 'asc' } },
          receipts: { orderBy: { createdAt: 'desc' } },
          // Deliberately minimal (this is shared with the customer app): no reserve price, bids or people.
          auctions: { orderBy: { createdAt: 'desc' }, select: { id: true, auctionNumber: true, status: true, scheduledDate: true, noticePeriodEndsAt: true } },
        },
      }),
      this.getOutstandingBreakdown(loanId),
    ]);
    return {
      ...full,
      outstanding: { principal: outstanding.principal.toFixed(2), interest: outstanding.interest.toFixed(2), charges: outstanding.charges.toFixed(2), total: outstanding.total.toFixed(2) },
    };
  }

  private async getLoanOrThrow(loanId: string) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return loan;
  }
}
