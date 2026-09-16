import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AUDIT_ACTION_KEY, AuditMeta } from '../decorators/audit.decorator';
import { AuditLogService } from '../../modules/audit-log/audit-log.service';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';

// Guarantees a baseline WHO/WHAT/WHEN/WHERE audit row for any handler tagged
// with @Audit(...), independent of whether the handler itself also records a
// richer before/after diff via AuditLogService (spec #44).
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_ACTION_KEY, context.getHandler());
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const referenceId = request.params?.id;

    return next.handle().pipe(
      tap(() => {
        void this.auditLogService.write({
          userId: request.user?.userId,
          employeeId: request.user?.employeeId,
          action: meta.action,
          referenceType: meta.referenceType,
          referenceId,
          ip: request.ip,
          device: request.headers['user-agent'] as string,
        });
      }),
    );
  }
}
