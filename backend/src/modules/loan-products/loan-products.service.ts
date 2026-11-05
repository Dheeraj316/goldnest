import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { CreateInterestRuleDto } from './dto/create-interest-rule.dto';
import { CreateChargeDto } from './dto/create-charge.dto';

@Injectable()
export class LoanProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLoanProductDto, actorEmployeeId: string) {
    const existing = await this.prisma.loanProduct.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new AppException(ErrorCode.DUPLICATE_RESOURCE, HttpStatus.CONFLICT, 'A loan product with this code already exists.');
    }
    if (dto.minLoanAmount > dto.maxLoanAmount) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'minLoanAmount cannot exceed maxLoanAmount.');
    }
    if (dto.minTenureDays > dto.maxTenureDays) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'minTenureDays cannot exceed maxTenureDays.');
    }
    return this.prisma.loanProduct.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        maxLtvPercent: dto.maxLtvPercent,
        minLoanAmount: dto.minLoanAmount,
        maxLoanAmount: dto.maxLoanAmount,
        minTenureDays: dto.minTenureDays,
        maxTenureDays: dto.maxTenureDays,
        gracePeriodDays: dto.gracePeriodDays ?? 0,
        createdBy: actorEmployeeId,
      },
    });
  }

  async list(activeOnly = false) {
    return this.prisma.loanProduct.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Customer-facing product catalogue, with the currently-in-force rate attached so the apply flow can show it without a second, staff-gated call. */
  async listActiveWithCurrentRate() {
    return this.prisma.loanProduct.findMany({
      where: { isActive: true },
      include: { interestRules: { where: { effectiveTo: null }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.loanProduct.findUnique({
      where: { id },
      include: {
        interestRules: { orderBy: { effectiveFrom: 'desc' } },
        charges: { where: { isActive: true } },
        branchProducts: { include: { branch: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!product) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return product;
  }

  /** The rule actually in force right now — the only one the interest engine may use. */
  async currentInterestRule(productId: string, asOf: Date = new Date()) {
    const rule = await this.prisma.interestRule.findFirst({
      where: { productId, effectiveFrom: { lte: asOf }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }] },
      orderBy: { effectiveFrom: 'desc' },
    });
    if (!rule) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.CONFLICT, 'This product has no active interest rule configured.');
    }
    return rule;
  }

  async addInterestRule(productId: string, dto: CreateInterestRuleDto, actorEmployeeId: string) {
    await this.assertProductExists(productId);
    const now = new Date();
    return this.prisma.$transaction(async (tx) => {
      // Close out whatever rule is currently open — a product has exactly one
      // in-force interest rule at any instant (spec #124: old version closed,
      // new version opened, never mutated in place).
      await tx.interestRule.updateMany({
        where: { productId, effectiveTo: null },
        data: { effectiveTo: now },
      });
      return tx.interestRule.create({
        data: {
          productId,
          method: dto.method,
          annualRatePercent: dto.annualRatePercent,
          accrualFrequency: dto.accrualFrequency,
          paymentFrequency: dto.paymentFrequency,
          penalRatePercent: dto.penalRatePercent ?? 0,
          effectiveFrom: now,
          createdBy: actorEmployeeId,
        },
      });
    });
  }

  async addCharge(productId: string, dto: CreateChargeDto) {
    await this.assertProductExists(productId);
    return this.prisma.charge.create({
      data: { productId, code: dto.code, name: dto.name, calcType: dto.calcType, amount: dto.amount },
    });
  }

  private async assertProductExists(id: string) {
    const product = await this.prisma.loanProduct.findUnique({ where: { id }, select: { id: true } });
    if (!product) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }
}
