import { HttpStatus, Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../database/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/utils/error-codes';
import { SmsService } from './sms.service';

export type OtpPurpose = 'REGISTRATION' | 'LOGIN' | 'TRANSACTION' | 'PASSWORD_RESET';

const OTP_TTL_MINUTES = 5;
const OTP_LENGTH = 6;
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_WINDOW = 5;
const REQUEST_WINDOW_MINUTES = 15;

// OTP throttling belongs on Redis in a multi-instance deployment (spec #8);
// this DB-backed implementation is correct and durable for a single-region
// launch and keeps the audit trail in Postgres. Swap the throttle check for
// a Redis counter if/when request volume needs it — the interface stays the same.
@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
  ) {}

  async requestOtp(mobile: string, purpose: OtpPurpose, ip?: string): Promise<void> {
    const windowStart = new Date(Date.now() - REQUEST_WINDOW_MINUTES * 60_000);
    const recentCount = await this.prisma.otpChallenge.count({
      where: { mobile, purpose, createdAt: { gte: windowStart } },
    });
    if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
      throw new AppException(ErrorCode.RATE_LIMITED, HttpStatus.TOO_MANY_REQUESTS);
    }

    const code = this.generateCode();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.otpChallenge.create({
      data: {
        mobile,
        purpose,
        codeHash,
        maxAttempts: MAX_ATTEMPTS,
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
        ip,
      },
    });

    await this.smsService.sendOtp(mobile, code);
  }

  async verifyOtp(mobile: string, purpose: OtpPurpose, code: string): Promise<void> {
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { mobile, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new AppException(ErrorCode.OTP_INVALID, HttpStatus.BAD_REQUEST);
    }
    if (challenge.expiresAt < new Date()) {
      throw new AppException(ErrorCode.OTP_EXPIRED, HttpStatus.BAD_REQUEST);
    }
    if (challenge.attempts >= challenge.maxAttempts) {
      throw new AppException(ErrorCode.OTP_EXPIRED, HttpStatus.BAD_REQUEST, 'Too many incorrect attempts. Please request a new code.');
    }

    const isValid = await bcrypt.compare(code, challenge.codeHash);
    if (!isValid) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw new AppException(ErrorCode.OTP_INVALID, HttpStatus.BAD_REQUEST);
    }

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
  }

  /** True if `mobile` has a consumed, still-fresh OTP for `purpose` — used to gate multi-step flows like registration. */
  async wasRecentlyVerified(mobile: string, purpose: OtpPurpose, withinMinutes = 15): Promise<boolean> {
    const since = new Date(Date.now() - withinMinutes * 60_000);
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: { mobile, purpose, consumedAt: { gte: since } },
      orderBy: { consumedAt: 'desc' },
    });
    return !!challenge;
  }

  private generateCode(): string {
    const min = 10 ** (OTP_LENGTH - 1);
    const max = 10 ** OTP_LENGTH - 1;
    // Cryptographically secure — Math.random() is predictable and must never
    // back a security-sensitive code like an OTP.
    return randomInt(min, max + 1).toString();
  }
}
