import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { ImportBankTransactionsDto, ManualMatchDto, QueryBankTransactionsDto } from './dto/reconciliation.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('reconciliation')
@ApiBearerAuth()
@Controller('reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Post('bank-transactions/import')
  @RequirePermissions('reconciliation.manage')
  @Audit({ action: 'RECONCILIATION.IMPORT', referenceType: 'BankTransaction' })
  import(@Body() dto: ImportBankTransactionsDto) {
    return this.reconciliationService.importTransactions(dto);
  }

  @Post('auto-match')
  @RequirePermissions('reconciliation.manage')
  @Audit({ action: 'RECONCILIATION.AUTO_MATCH', referenceType: 'BankTransaction' })
  autoMatch() {
    return this.reconciliationService.autoMatchAll();
  }

  @Get('bank-transactions')
  @RequirePermissions('reconciliation.view')
  list(@Query() query: QueryBankTransactionsDto) {
    return this.reconciliationService.list(query);
  }

  @Get('bank-transactions/:id')
  @RequirePermissions('reconciliation.view')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.getOne(id);
  }

  @Get('bank-transactions/:id/candidates')
  @RequirePermissions('reconciliation.view')
  candidates(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.getMatchCandidates(id);
  }

  @Post('bank-transactions/:id/match')
  @RequirePermissions('reconciliation.manage')
  @Audit({ action: 'RECONCILIATION.MATCH', referenceType: 'BankTransaction' })
  match(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ManualMatchDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reconciliationService.manualMatch(id, dto, user);
  }

  @Post('bank-transactions/:id/unmatch')
  @RequirePermissions('reconciliation.manage')
  @Audit({ action: 'RECONCILIATION.UNMATCH', referenceType: 'BankTransaction' })
  unmatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.reconciliationService.unmatch(id);
  }
}
