import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { BranchScopeService } from '../../common/guards/branch-scope.service';

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
  ) {}

  async create(dto: CreateBranchDto) {
    const existing = await this.prisma.branch.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new AppException(ErrorCode.DUPLICATE_RESOURCE, HttpStatus.CONFLICT, `Branch code "${dto.code}" is already in use.`);
    }
    return this.prisma.branch.create({
      data: {
        organizationId: dto.organizationId,
        regionId: dto.regionId,
        code: dto.code,
        name: dto.name,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        pinCode: dto.pinCode,
        phone: dto.phone,
        email: dto.email,
        cashLimit: dto.cashLimit ?? '0',
      },
    });
  }

  // Branch-level data isolation (spec #48): a branch-scoped employee only ever
  // sees their own branch in listings; cross-branch roles see everything.
  async findAll(user: JwtPayloadUser) {
    if (this.branchScope.isCrossBranch(user)) {
      return this.prisma.branch.findMany({ where: { deletedAt: null }, orderBy: { name: 'asc' } });
    }
    return this.prisma.branch.findMany({ where: { id: user.branchId, deletedAt: null } });
  }

  async findOne(id: string, user: JwtPayloadUser) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch || branch.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    this.branchScope.assertAccess(user, branch.id);
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.ensureExists(id);
    return this.prisma.branch.update({
      where: { id },
      data: {
        regionId: dto.regionId,
        name: dto.name,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        state: dto.state,
        pinCode: dto.pinCode,
        phone: dto.phone,
        email: dto.email,
        cashLimit: dto.cashLimit,
        status: dto.status,
      },
    });
  }

  async deactivate(id: string) {
    await this.ensureExists(id);
    return this.prisma.branch.update({ where: { id }, data: { status: 'INACTIVE' } });
  }

  private async ensureExists(id: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch || branch.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return branch;
  }
}
