import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomUUID } from 'crypto';
import * as ms from '../../../common/utils/ms';
import { PrismaService } from '../../../database/prisma.service';
import { JwtPayloadUser } from '../../../common/interfaces/authenticated-request.interface';
import { AppException } from '../../../common/exceptions/app.exception';
import { ErrorCode } from '../../../common/utils/error-codes';

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Refresh tokens are opaque, high-entropy random strings — never JWTs — so
// they can be revoked server-side instantly (a signed JWT can't be
// un-issued before it expires). Only a SHA-256 hash is persisted; the raw
// value exists only in transit to the client, matching how the access-token
// secret is never itself stored.
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  signAccessToken(payload: JwtPayloadUser): { token: string; expiresIn: number } {
    const expiresIn = this.configService.get<string>('jwt.accessExpiresIn') || '15m';
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn,
    });
    return { token, expiresIn: ms.toSeconds(expiresIn) };
  }

  async issueRefreshToken(userId: string, deviceId: string | undefined, ip: string | undefined, familyId?: string): Promise<string> {
    const raw = randomUUID() + randomUUID();
    const tokenHash = this.hash(raw);
    const expiresInMs = ms.toMillis(this.configService.get<string>('jwt.refreshExpiresIn') || '30d');

    await this.prisma.refreshToken.create({
      data: {
        userId,
        deviceId,
        tokenHash,
        familyId: familyId || randomUUID(),
        expiresAt: new Date(Date.now() + expiresInMs),
        ip,
      },
    });

    return raw;
  }

  /**
   * Validates and rotates a refresh token. If a token that was already
   * rotated/revoked is presented again, that's a strong signal of token
   * theft (replay of a stolen refresh token) — the entire family is
   * revoked, forcing re-authentication on every device sharing that lineage.
   */
  async rotateRefreshToken(rawToken: string, ip?: string): Promise<{ userId: string; deviceId?: string; newRawToken: string }> {
    const tokenHash = this.hash(rawToken);
    const existing = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!existing) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Invalid or expired session.');
    }

    if (existing.revokedAt) {
      await this.revokeFamily(existing.familyId);
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Session invalidated. Please sign in again.');
    }

    if (existing.expiresAt < new Date()) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED, 'Session expired. Please sign in again.');
    }

    const newRawToken = await this.issueRefreshToken(existing.userId, existing.deviceId ?? undefined, ip, existing.familyId);
    const newHash = this.hash(newRawToken);
    const newRecord = await this.prisma.refreshToken.findUnique({ where: { tokenHash: newHash } });

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date(), replacedBy: newRecord?.id },
    });

    return { userId: existing.userId, deviceId: existing.deviceId ?? undefined, newRawToken };
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeDevice(userId: string, deviceId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, deviceId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
