import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ResetAccessDto, TransferBranchDto, UpdateEmployeeDto } from './dto/update-employee.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly numberGenerator: NumberGeneratorService,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch || branch.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Branch not found.');
    }
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Role not found.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ mobile: dto.mobile }, ...(dto.email ? [{ email: dto.email }] : [])] },
    });
    if (existingUser) {
      throw new AppException(ErrorCode.DUPLICATE_RESOURCE, HttpStatus.CONFLICT, 'A user with this mobile or email already exists.');
    }

    const employeeCode = await this.numberGenerator.generateEmployeeCode(branch.code);
    const passwordHash = await bcrypt.hash(dto.initialPassword, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { type: 'EMPLOYEE', mobile: dto.mobile, email: dto.email, passwordHash },
      });
      return tx.employee.create({
        data: {
          userId: user.id,
          employeeCode,
          branchId: dto.branchId,
          roleId: dto.roleId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          mobile: dto.mobile,
          joinedAt: new Date(),
        },
        include: { role: true, branch: true },
      });
    });
  }

  async findAll(user: JwtPayloadUser) {
    const where = this.branchScope.isCrossBranch(user) ? { deletedAt: null } : { deletedAt: null, branchId: user.branchId };
    return this.prisma.employee.findMany({ where, include: { role: true, branch: true }, orderBy: { firstName: 'asc' } });
  }

  async findOne(id: string, user: JwtPayloadUser) {
    const employee = await this.findEmployeeOrThrow(id);
    this.branchScope.assertAccess(user, employee.branchId);
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findEmployeeOrThrow(id);
    return this.prisma.employee.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        roleId: dto.roleId,
        status: dto.status,
      },
      include: { role: true, branch: true },
    });
  }

  async transferBranch(id: string, dto: TransferBranchDto) {
    const employee = await this.findEmployeeOrThrow(id);
    const targetBranch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!targetBranch || targetBranch.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Target branch not found.');
    }
    return this.prisma.employee.update({
      where: { id: employee.id },
      data: { branchId: dto.branchId },
      include: { role: true, branch: true },
    });
  }

  async activate(id: string) {
    const employee = await this.findEmployeeOrThrow(id);
    await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id }, data: { status: 'ACTIVE', deactivatedAt: null } }),
      this.prisma.user.update({ where: { id: employee.userId }, data: { status: 'ACTIVE' } }),
    ]);
    return this.findEmployeeOrThrow(id);
  }

  async deactivate(id: string) {
    const employee = await this.findEmployeeOrThrow(id);
    await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id }, data: { status: 'INACTIVE', deactivatedAt: new Date() } }),
      this.prisma.user.update({ where: { id: employee.userId }, data: { status: 'INACTIVE' } }),
      // Deactivation must immediately end any live sessions (spec #49, #58).
      this.prisma.refreshToken.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    return this.findEmployeeOrThrow(id);
  }

  /** Resets password and force-revokes all active sessions/devices (spec #49). Returns the temp password once, if generated. */
  async resetAccess(id: string, dto: ResetAccessDto): Promise<{ temporaryPassword?: string }> {
    const employee = await this.findEmployeeOrThrow(id);
    const newPassword = dto.newPassword || randomBytes(9).toString('base64url');
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: employee.userId },
        data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
      }),
      this.prisma.refreshToken.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.userDevice.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    return dto.newPassword ? {} : { temporaryPassword: newPassword };
  }

  private async findEmployeeOrThrow(id: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return employee;
  }
}
