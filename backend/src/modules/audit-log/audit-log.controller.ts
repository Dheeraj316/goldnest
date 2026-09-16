import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

// Read-only by design. There is intentionally no PATCH/DELETE route here —
// audit logs must never be editable or removable by application users.
@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @RequirePermissions('audit_log.view')
  list(@Query() query: QueryAuditLogDto) {
    return this.auditLogService.list({
      userId: query.userId,
      action: query.action,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('reference/:referenceType/:referenceId')
  @RequirePermissions('audit_log.view')
  findByReference(@Param('referenceType') referenceType: string, @Param('referenceId') referenceId: string) {
    return this.auditLogService.findByReference(referenceType, referenceId);
  }
}
