import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RiskAlertsService } from './risk-alerts.service';
import { QueryAlertsDto, ReviewAlertDto } from './dto/risk-alert.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('risk-alerts')
@ApiBearerAuth()
@Controller('risk-alerts')
export class RiskAlertsController {
  constructor(private readonly riskAlertsService: RiskAlertsService) {}

  @Post('scan')
  @RequirePermissions('risk.manage')
  @Audit({ action: 'RISK_ALERT.SCAN', referenceType: 'RiskAlert' })
  scan() {
    return this.riskAlertsService.scan();
  }

  @Get()
  @RequirePermissions('risk.view')
  list(@Query() query: QueryAlertsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.riskAlertsService.list(user, query);
  }

  @Get(':id')
  @RequirePermissions('risk.view')
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.riskAlertsService.get(user, id);
  }

  @Post(':id/review')
  @RequirePermissions('risk.manage')
  @Audit({ action: 'RISK_ALERT.REVIEW', referenceType: 'RiskAlert' })
  review(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewAlertDto, @CurrentUser() user: JwtPayloadUser) {
    return this.riskAlertsService.review(user, id, dto);
  }
}
