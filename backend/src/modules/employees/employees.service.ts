import { HttpStatus, Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { BranchScopeService } from '../../common/guards/branch-scope.service';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import { RbacService } from '../rbac/rbac.service';
import { roleAssignmentViolation, superAdminAccountViolation } from './employee-rules';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ResetAccessDto, TransferBranchDto, UpdateEmployeeDto } from './dto/update-employee.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchScope: BranchScopeService,
    private readonly numberGenerator: NumberGeneratorService,
    private readonly rbac: RbacService,
  ) {}

  private forbid(message: string): never {
    throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, message);
  }

  /** Only a Super Admin may change or take over a Super Admin's account (password reset, deactivation, role, branch). */
  private assertMayManage(actor: JwtPayloadUser, employee: { role: { code: string } }): void {
    const problem = superAdminAccountViolation(actor.roleCode, employee.role.code);
    if (problem) this.forbid(problem);
  }

  async create(dto: CreateEmployeeDto, actor: JwtPayloadUser) {
    this.branchScope.assertAccess(actor, dto.branchId);
    const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
    if (!branch || branch.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Branch not found.');
    }
    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Role not found.');
    }
    const roleProblem = roleAssignmentViolation({ actorRoleCode: actor.roleCode, newRoleCode: role.code, isSelf: false, isChange: false });
    if (roleProblem) this.forbid(roleProblem);

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

  // Self-service: every employee needs their own name/role/branch for the
  // business app's home screen, regardless of whether their role carries
  // `employee.view` (most operational roles — appraiser, cashier, loan
  // officer — don't; only branch managers and above do).
  async findMe(employeeId: string) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, include: { role: true, branch: true } });
    if (!employee || employee.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return employee;
  }

  async findOne(id: string, user: JwtPayloadUser) {
    const employee = await this.findEmployeeOrThrow(id);
    this.branchScope.assertAccess(user, employee.branchId);
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto, actor: JwtPayloadUser) {
    const employee = await this.findEmployeeOrThrow(id);
    this.branchScope.assertAccess(actor, employee.branchId);
    this.assertMayManage(actor, employee);

    if (dto.roleId !== undefined) {
      const newRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!newRole) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Role not found.');
      const problem = roleAssignmentViolation({
        actorRoleCode: actor.roleCode,
        newRoleCode: newRole.code,
        isSelf: employee.id === actor.employeeId,
        isChange: dto.roleId !== employee.roleId,
      });
      if (problem) this.forbid(problem);
    }

    const updated = await this.prisma.employee.update({
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
    // A new role or status applies to this person's very next request.
    this.rbac.invalidateLiveAccess();
    return updated;
  }

  async transferBranch(id: string, dto: TransferBranchDto, actor: JwtPayloadUser) {
    const employee = await this.findEmployeeOrThrow(id);
    this.assertMayManage(actor, employee);
    // Moving staff between branches is inherently a cross-branch action — a
    // branch-scoped manager has no authority over the destination branch, so
    // this always requires a cross-branch role, unlike the branch-scoped
    // checks below.
    if (!this.branchScope.isCrossBranch(actor)) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
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

  async activate(id: string, actor: JwtPayloadUser) {
    const employee = await this.findEmployeeOrThrow(id);
    this.branchScope.assertAccess(actor, employee.branchId);
    this.assertMayManage(actor, employee);
    await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id }, data: { status: 'ACTIVE', deactivatedAt: null } }),
      this.prisma.user.update({ where: { id: employee.userId }, data: { status: 'ACTIVE' } }),
    ]);
    this.rbac.invalidateLiveAccess();
    return this.findEmployeeOrThrow(id);
  }

  async deactivate(id: string, actor: JwtPayloadUser) {
    const employee = await this.findEmployeeOrThrow(id);
    this.branchScope.assertAccess(actor, employee.branchId);
    this.assertMayManage(actor, employee);
    await this.prisma.$transaction([
      this.prisma.employee.update({ where: { id }, data: { status: 'INACTIVE', deactivatedAt: new Date() } }),
      this.prisma.user.update({ where: { id: employee.userId }, data: { status: 'INACTIVE' } }),
      // Deactivation must immediately end any live sessions (spec #49, #58).
      this.prisma.refreshToken.updateMany({ where: { userId: employee.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    // ...and their access token stops working now, not when it expires.
    this.rbac.invalidateLiveAccess();
    return this.findEmployeeOrThrow(id);
  }

  /** Resets password and force-revokes all active sessions/devices (spec #49). Returns the temp password once, if generated. */
  async resetAccess(id: string, dto: ResetAccessDto, actor: JwtPayloadUser): Promise<{ temporaryPassword?: string }> {
    const employee = await this.findEmployeeOrThrow(id);
    this.branchScope.assertAccess(actor, employee.branchId);
    this.assertMayManage(actor, employee);
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
    const employee = await this.prisma.employee.findUnique({ where: { id }, include: { role: { select: { code: true } } } });
    if (!employee || employee.deletedAt) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return employee;
  }
}
