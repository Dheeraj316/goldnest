import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { maskIdentifier } from '../../common/utils/mask';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
  ) {}

  // ---- Customer self-service ----

  async getOwnProfile(customerId: string) {
    return this.getFullProfile(customerId);
  }

  async updateOwnProfile(customerId: string, dto: UpdateCustomerProfileDto) {
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email, gender: dto.gender },
    });
    return this.getFullProfile(customerId);
  }

  async submitOwnKyc(customerId: string, dto: SubmitKycDto) {
    const maskedNumber = maskIdentifier(dto.rawNumber);
    // The raw value is deliberately never written to this record — only the
    // masked display value plus a pointer to an encrypted vault entry, which
    // the encryption-at-rest / secrets layer owns (spec #13, #43, #69).
    const kyc = await this.prisma.kycRecord.create({
      data: { customerId, docType: dto.docType, maskedNumber, status: 'PENDING' },
    });
    await this.prisma.customer.update({ where: { id: customerId }, data: { kycStatus: 'IN_REVIEW' } });
    return kyc;
  }

  // ---- Staff-facing ----

  async search(query: QueryCustomersDto, user: JwtPayloadUser) {
    const branchFilter = this.branchScope.isCrossBranch(user)
      ? query.branchId
        ? { branchId: query.branchId }
        : {}
      : { branchId: user.branchId };

    const where = {
      deletedAt: null,
      ...branchFilter,
      ...(query.mobile ? { mobile: { contains: query.mobile } } : {}),
      ...(query.customerCode ? { customerCode: { contains: query.customerCode, mode: 'insensitive' as const } } : {}),
      ...(query.name
        ? {
            OR: [
              { firstName: { contains: query.name, mode: 'insensitive' as const } },
              { lastName: { contains: query.name, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page: query.page, pageSize: query.pageSize };
  }

  async findOneForStaff(id: string, user: JwtPayloadUser) {
    const customer = await this.getFullProfile(id);
    this.branchScope.assertAccess(user, customer.branchId);
    return customer;
  }

  async reviewKyc(kycRecordId: string, dto: ReviewKycDto, reviewerEmployeeId: string) {
    const kyc = await this.prisma.kycRecord.findUnique({ where: { id: kycRecordId } });
    if (!kyc) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updated = await this.prisma.kycRecord.update({
      where: { id: kycRecordId },
      data: {
        status: dto.decision,
        verifiedBy: reviewerEmployeeId,
        verifiedAt: new Date(),
        rejectionReason: dto.decision === 'REJECTED' ? dto.rejectionReason : null,
      },
    });

    // Customer-level KYC status reflects the worst-case across all submitted
    // documents: any pending record keeps the customer IN_REVIEW; any
    // rejection flags REJECTED; only all-verified promotes to VERIFIED.
    const allRecords = await this.prisma.kycRecord.findMany({ where: { customerId: kyc.customerId } });
    const overallStatus = allRecords.some((r) => r.status === 'REJECTED')
      ? 'REJECTED'
      : allRecords.every((r) => r.status === 'VERIFIED')
        ? 'VERIFIED'
        : 'IN_REVIEW';
    await this.prisma.customer.update({ where: { id: kyc.customerId }, data: { kycStatus: overallStatus } });

    return updated;
  }

  private async getFullProfile(customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { addresses: true, kycRecords: true },
    });
    if (!customer || customer.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return customer;
  }
}
