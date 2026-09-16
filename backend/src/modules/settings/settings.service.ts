import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { RequestSettingChangeDto } from './dto/request-setting-change.dto';

// Sentinel for "no scope" — see the comment on Setting.scopeId in schema.prisma
// for why this exists instead of null.
const NO_SCOPE_ID = '00000000-0000-0000-0000-000000000000';

// Every regulatory/commercial parameter (LTV, rates, fees, tenure, approval
// limits, ...) is read through here — NEVER hard-coded in business logic
// (spec #2, #64). Changes go through a maker-checker approval trail; the
// live value only ever moves when a *different* authorized user approves it.
@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string, scope: string = 'GLOBAL', scopeId?: string) {
    const setting = await this.prisma.setting.findUnique({
      where: { key_scope_scopeId: { key, scope, scopeId: scopeId ?? NO_SCOPE_ID } },
    });
    if (!setting) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, `Setting "${key}" is not configured.`);
    }
    return setting;
  }

  async list(scope?: string, scopeId?: string) {
    return this.prisma.setting.findMany({
      where: { ...(scope ? { scope } : {}), ...(scopeId ? { scopeId } : {}) },
      orderBy: { key: 'asc' },
    });
  }

  async requestChange(dto: RequestSettingChangeDto, requestedBy: string) {
    const scope = dto.scope ?? 'GLOBAL';
    const scopeId = dto.scopeId ?? NO_SCOPE_ID;
    let setting = await this.prisma.setting.findUnique({
      where: { key_scope_scopeId: { key: dto.key, scope, scopeId } },
    });

    if (!setting) {
      setting = await this.prisma.setting.create({
        data: {
          key: dto.key,
          scope,
          scopeId,
          value: dto.value as any,
          dataType: dto.dataType,
          description: dto.description,
          status: 'PENDING_APPROVAL',
          updatedBy: requestedBy,
        },
      });
      return this.prisma.configurationVersion.create({
        data: {
          settingId: setting.id,
          previousValue: undefined,
          newValue: dto.value as any,
          changeReason: dto.changeReason,
          requestedBy,
          status: 'PENDING',
        },
      });
    }

    return this.prisma.configurationVersion.create({
      data: {
        settingId: setting.id,
        previousValue: setting.value as any,
        newValue: dto.value as any,
        changeReason: dto.changeReason,
        requestedBy,
        status: 'PENDING',
      },
    });
  }

  async listPendingChanges() {
    return this.prisma.configurationVersion.findMany({
      where: { status: 'PENDING' },
      include: { setting: true },
      orderBy: { requestedAt: 'asc' },
    });
  }

  async approveChange(versionId: string, approvedBy: string) {
    const version = await this.prisma.configurationVersion.findUnique({ where: { id: versionId }, include: { setting: true } });
    if (!version) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (version.status !== 'PENDING') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, 'This change has already been decided.');
    }
    if (version.requestedBy === approvedBy) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN);
    }

    const [updatedVersion] = await this.prisma.$transaction([
      this.prisma.configurationVersion.update({
        where: { id: versionId },
        data: { status: 'APPROVED', approvedBy, decidedAt: new Date() },
      }),
      this.prisma.setting.update({
        where: { id: version.settingId },
        data: { value: version.newValue as any, status: 'ACTIVE', updatedBy: approvedBy },
      }),
    ]);

    return updatedVersion;
  }

  async rejectChange(versionId: string, approvedBy: string, reason?: string) {
    const version = await this.prisma.configurationVersion.findUnique({ where: { id: versionId } });
    if (!version) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (version.status !== 'PENDING') {
      throw new AppException(ErrorCode.INVALID_STATE_TRANSITION, HttpStatus.CONFLICT, 'This change has already been decided.');
    }
    if (version.requestedBy === approvedBy) {
      throw new AppException(ErrorCode.SELF_APPROVAL_NOT_ALLOWED, HttpStatus.FORBIDDEN);
    }

    return this.prisma.configurationVersion.update({
      where: { id: versionId },
      data: { status: 'REJECTED', approvedBy, decidedAt: new Date(), changeReason: reason ?? version.changeReason },
    });
  }
}
