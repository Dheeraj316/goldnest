import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface WriteAuditLogInput {
  userId?: string;
  employeeId?: string;
  action: string;
  referenceType?: string;
  referenceId?: string;
  beforeValue?: unknown;
  afterValue?: unknown;
  ip?: string;
  device?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  // Audit logs are append-only by design: this is the ONLY write path, and
  // there is deliberately no update/delete method anywhere in this service
  // or its controller (spec #44 — "never allow ordinary users to delete audit logs").
  async write(input: WriteAuditLogInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        employeeId: input.employeeId,
        action: input.action,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        beforeValue: input.beforeValue as any,
        afterValue: input.afterValue as any,
        ip: input.ip,
        device: input.device,
      },
    });
  }

  async findByReference(referenceType: string, referenceId: string) {
    return this.prisma.auditLog.findMany({
      where: { referenceType, referenceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async list(params: { userId?: string; action?: string; from?: Date; to?: Date; page: number; pageSize: number }) {
    const where = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}
