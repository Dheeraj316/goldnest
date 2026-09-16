import { HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { generateBase32Secret, buildOtpAuthUrl, verifyTotp } from '../../common/utils/totp';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { RbacService } from '../rbac/rbac.service';
import { NumberGeneratorService } from '../number-generator/number-generator.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { CompleteCustomerRegistrationDto } from './dto/complete-customer-registration.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { DeviceInfoDto } from './dto/device-info.dto';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    type: 'CUSTOMER' | 'EMPLOYEE';
    mobile: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly rbacService: RbacService,
    private readonly numberGenerator: NumberGeneratorService,
  ) {}

  // ---- Customer: registration -------------------------------------------

  async requestCustomerOtp(dto: RequestOtpDto, ip?: string): Promise<void> {
    const existingUser = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });

    if (dto.purpose === 'REGISTRATION' && existingUser) {
      throw new AppException(
        ErrorCode.DUPLICATE_RESOURCE,
        HttpStatus.CONFLICT,
        'This mobile number is already registered. Please sign in instead.',
      );
    }
    if (dto.purpose === 'LOGIN' && (!existingUser || existingUser.type !== 'CUSTOMER')) {
      throw new AppException(
        ErrorCode.RESOURCE_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        'No account found for this mobile number. Please register first.',
      );
    }

    await this.otpService.requestOtp(dto.mobile, dto.purpose, ip);
  }

  async verifyRegistrationOtp(mobile: string, code: string): Promise<void> {
    await this.otpService.verifyOtp(mobile, 'REGISTRATION', code);
  }

  async completeCustomerRegistration(dto: CompleteCustomerRegistrationDto, ip?: string): Promise<AuthResult> {
    const recentlyVerified = await this.otpService.wasRecentlyVerified(dto.mobile, 'REGISTRATION');
    if (!recentlyVerified) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        'Please verify your mobile number with OTP before completing registration.',
      );
    }

    const existingUser = await this.prisma.user.findUnique({ where: { mobile: dto.mobile } });
    if (existingUser) {
      throw new AppException(ErrorCode.DUPLICATE_RESOURCE, HttpStatus.CONFLICT);
    }

    const customerCode = await this.numberGenerator.generateCustomerCode();

    const { user, customer } = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { type: 'CUSTOMER', mobile: dto.mobile },
      });
      const customer = await tx.customer.create({
        data: {
          userId: user.id,
          customerCode,
          firstName: dto.firstName,
          lastName: dto.lastName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          gender: dto.gender,
          email: dto.email,
          mobile: dto.mobile,
          addresses: {
            create: {
              line1: dto.address.line1,
              line2: dto.address.line2,
              pinCode: dto.address.pinCode,
              city: dto.address.city,
              state: dto.address.state,
              type: 'RESIDENTIAL',
              isPrimary: true,
            },
          },
        },
      });
      return { user, customer };
    });

    await this.registerDevice(user.id, dto.device, ip);

    return this.issueSession(
      { userId: user.id, userType: 'CUSTOMER', customerId: customer.id, permissions: [], deviceId: dto.device.deviceId },
      user.mobile,
      dto.device.deviceId,
      ip,
    );
  }

  // ---- Customer: login ----------------------------------------------------

  async customerLogin(dto: CustomerLoginDto, ip?: string): Promise<AuthResult> {
    await this.otpService.verifyOtp(dto.mobile, 'LOGIN', dto.code);

    const user = await this.prisma.user.findUnique({
      where: { mobile: dto.mobile },
      include: { customer: true },
    });
    if (!user || !user.customer) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (user.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, 'This account is not active. Please contact support.');
    }

    await this.registerDevice(user.id, dto.device, ip);
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return this.issueSession(
      { userId: user.id, userType: 'CUSTOMER', customerId: user.customer.id, permissions: [], deviceId: dto.device.deviceId },
      user.mobile,
      dto.device.deviceId,
      ip,
    );
  }

  // ---- Employee: login ------------------------------------------------------

  async employeeLogin(dto: EmployeeLoginDto, ip?: string): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: {
        type: 'EMPLOYEE',
        OR: [{ mobile: dto.identifier }, { email: dto.identifier }],
      },
      include: { employee: { include: { role: true, branch: true } } },
    });

    if (!user || !user.employee || !user.passwordHash) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Invalid credentials.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppException(ErrorCode.ACCOUNT_LOCKED, HttpStatus.FORBIDDEN);
    }
    if (user.status !== 'ACTIVE' || user.employee.status !== 'ACTIVE') {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, 'This account is not active.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.registerFailedLogin(user.id, user.failedLoginCount);
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Invalid credentials.');
    }

    if (user.mfaEnabled) {
      if (!dto.mfaCode || !user.mfaSecret || !verifyTotp(user.mfaSecret, dto.mfaCode)) {
        throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED, 'Invalid or missing MFA code.');
      }
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const permissions = await this.rbacService.getPermissionCodesForRole(user.employee.roleId);
    await this.registerDevice(user.id, dto.device, ip);

    return this.issueSession(
      {
        userId: user.id,
        userType: 'EMPLOYEE',
        employeeId: user.employee.id,
        branchId: user.employee.branchId,
        roleCode: user.employee.role.code,
        permissions,
        deviceId: dto.device.deviceId,
      },
      user.mobile,
      dto.device.deviceId,
      ip,
    );
  }

  private async registerFailedLogin(userId: string, currentCount: number): Promise<void> {
    const newCount = currentCount + 1;
    const data: { failedLoginCount: number; lockedUntil?: Date } = { failedLoginCount: newCount };
    if (newCount >= MAX_FAILED_LOGINS) {
      data.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60_000);
    }
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  // ---- MFA enrollment (employees) -----------------------------------------

  async setupMfa(userId: string): Promise<{ secret: string; otpAuthUrl: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const secret = generateBase32Secret();
    await this.prisma.user.update({ where: { id: userId }, data: { mfaSecret: secret, mfaEnabled: false } });
    return { secret, otpAuthUrl: buildOtpAuthUrl({ secret, accountName: user.mobile, issuer: 'Goldnest' }) };
  }

  async confirmMfa(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.mfaSecret || !verifyTotp(user.mfaSecret, code)) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.BAD_REQUEST, 'Invalid MFA code.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { mfaEnabled: true } });
  }

  // ---- Session lifecycle ---------------------------------------------------

  async refresh(rawRefreshToken: string, ip?: string): Promise<AuthResult> {
    const { userId, deviceId, newRawToken } = await this.tokenService.rotateRefreshToken(rawRefreshToken, ip);

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { customer: true, employee: { include: { role: true } } },
    });

    let payload: JwtPayloadUser;
    if (user.type === 'CUSTOMER' && user.customer) {
      payload = { userId: user.id, userType: 'CUSTOMER', customerId: user.customer.id, permissions: [], deviceId };
    } else if (user.type === 'EMPLOYEE' && user.employee) {
      const permissions = await this.rbacService.getPermissionCodesForRole(user.employee.roleId);
      payload = {
        userId: user.id,
        userType: 'EMPLOYEE',
        employeeId: user.employee.id,
        branchId: user.employee.branchId,
        roleCode: user.employee.role.code,
        permissions,
        deviceId,
      };
    } else {
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED);
    }

    const { token: accessToken, expiresIn } = this.tokenService.signAccessToken(payload);
    return {
      accessToken,
      refreshToken: newRawToken,
      expiresIn,
      user: { id: user.id, type: user.type, mobile: user.mobile },
    };
  }

  async logout(userId: string, deviceId?: string): Promise<void> {
    if (deviceId) {
      await this.tokenService.revokeDevice(userId, deviceId);
    } else {
      await this.tokenService.revokeAllForUser(userId);
    }
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.tokenService.revokeAllForUser(userId);
    await this.prisma.userDevice.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async listDevices(userId: string) {
    return this.prisma.userDevice.findMany({ where: { userId, revokedAt: null }, orderBy: { lastSeenAt: 'desc' } });
  }

  // ---- helpers --------------------------------------------------------------

  private async issueSession(
    payload: JwtPayloadUser,
    mobile: string,
    deviceId: string | undefined,
    ip: string | undefined,
  ): Promise<AuthResult> {
    const { token: accessToken, expiresIn } = this.tokenService.signAccessToken(payload);
    const refreshToken = await this.tokenService.issueRefreshToken(payload.userId, deviceId, ip);
    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: { id: payload.userId, type: payload.userType, mobile },
    };
  }

  private async registerDevice(userId: string, device: DeviceInfoDto, ip?: string): Promise<void> {
    if (!device.deviceId) return;
    await this.prisma.userDevice.upsert({
      where: { userId_deviceId: { userId, deviceId: device.deviceId } },
      create: {
        userId,
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        platform: device.platform,
        pushToken: device.pushToken,
        lastSeenAt: new Date(),
        lastSeenIp: ip,
      },
      update: {
        lastSeenAt: new Date(),
        lastSeenIp: ip,
        pushToken: device.pushToken,
        revokedAt: null,
      },
    });
  }
}
