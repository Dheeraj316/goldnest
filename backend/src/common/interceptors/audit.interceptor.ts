import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
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
  private readonly logger = new Logger(AuditInterceptor.name);

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
        // Fire-and-forget by design (the response shouldn't wait on this),
        // but that makes it an unhandled promise rejection waiting to happen
        // — and an unhandled rejection crashes the whole Node process. Audit
        // logging must never be able to take the API down, so every failure
        // is caught and logged instead of thrown.
        this.auditLogService
          .write({
            userId: request.user?.userId,
            employeeId: request.user?.employeeId,
            action: meta.action,
            referenceType: meta.referenceType,
            referenceId,
            ip: request.ip,
            device: request.headers['user-agent'] as string,
          })
          .catch((error) => {
            this.logger.error(`Failed to write audit log for action "${meta.action}": ${error instanceof Error ? error.message : error}`);
          });
      }),
    );
  }
}
