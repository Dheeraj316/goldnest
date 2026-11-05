import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CashManagementService } from './cash-management.service';
import { CloseCashRegisterDto, OpenCashRegisterDto, QueryCashDayDto, QueryCashHistoryDto, RecordCashEntryDto } from './dto/cash.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('cash-management')
@ApiBearerAuth()
@Controller('cash-management')
export class CashManagementController {
  constructor(private readonly cashService: CashManagementService) {}

  @Get('today')
  @RequirePermissions('cash.view')
  today(@Query() query: QueryCashDayDto, @CurrentUser() user: JwtPayloadUser) {
    return this.cashService.getDaySummary(query, user);
  }

  @Get('history')
  @RequirePermissions('cash.view')
  history(@Query() query: QueryCashHistoryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.cashService.listHistory(query, user);
  }

  @Post('open')
  @RequirePermissions('cash.manage')
  @Audit({ action: 'CASH.OPEN', referenceType: 'CashTransaction' })
  open(@Body() dto: OpenCashRegisterDto, @CurrentUser() user: JwtPayloadUser) {
    return this.cashService.openDay(dto, user);
  }

  @Post('entries')
  @RequirePermissions('cash.manage')
  @Audit({ action: 'CASH.ENTRY', referenceType: 'CashTransaction' })
  recordEntry(@Body() dto: RecordCashEntryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.cashService.recordEntry(dto, user);
  }

  @Post('close')
  @RequirePermissions('cash.manage')
  @Audit({ action: 'CASH.CLOSE', referenceType: 'CashTransaction' })
  close(@Body() dto: CloseCashRegisterDto, @CurrentUser() user: JwtPayloadUser) {
    return this.cashService.closeDay(dto, user);
  }
}
