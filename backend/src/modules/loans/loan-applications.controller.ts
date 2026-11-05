import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { CreateLoanApplicationDto } from './dto/create-loan-application.dto';
import { QueryLoanApplicationsDto } from './dto/query-loan-applications.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';

@ApiTags('loan-applications')
@ApiBearerAuth()
@Controller('loan-applications')
export class LoanApplicationsController {
  constructor(private readonly loansService: LoansService) {}

  // ---- Customer self-service ----

  @Post('me')
  @Audit({ action: 'LOAN_APPLICATION.CREATE', referenceType: 'LoanApplication' })
  applyAsCustomer(@Body() dto: CreateLoanApplicationDto, @CurrentUser() user: JwtPayloadUser) {
    this.assertCustomer(user);
    return this.loansService.createApplication(dto, user);
  }

  @Get('me')
  listOwnApplications(@CurrentUser() user: JwtPayloadUser) {
    this.assertCustomer(user);
    return this.loansService.listMyApplications(user.customerId!);
  }

  // ---- Staff-facing ----

  @Post()
  @RequirePermissions('loan_application.create')
  @Audit({ action: 'LOAN_APPLICATION.CREATE', referenceType: 'LoanApplication' })
  createForCustomer(@Body() dto: CreateLoanApplicationDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.createApplication(dto, user);
  }

  @Get()
  @RequirePermissions('loan_application.view')
  list(@Query() query: QueryLoanApplicationsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.listApplications(query, user);
  }

  @Get(':id')
  @RequirePermissions('loan_application.view')
  @Audit({ action: 'LOAN_APPLICATION.VIEW', referenceType: 'LoanApplication' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.findApplication(id, user);
  }

  @Post(':id/start-appraisal')
  @RequirePermissions('loan_application.view')
  @Audit({ action: 'LOAN_APPLICATION.START_APPRAISAL', referenceType: 'LoanApplication' })
  startAppraisal(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.startAppraisal(id, user);
  }

  private assertCustomer(user: JwtPayloadUser) {
    if (user.userType !== 'CUSTOMER' || !user.customerId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, 'This endpoint is only available to customer accounts.');
    }
  }
}
