import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoansService } from './loans.service';
import { QueryLoanApplicationsDto } from './dto/query-loan-applications.dto';
import { CreateCollateralDto } from './dto/create-collateral.dto';
import { CreateAppraisalDto } from './dto/create-appraisal.dto';
import { DecideAppraisalDto } from './dto/decide-appraisal.dto';
import { DecideLoanApprovalDto } from './dto/decide-loan-approval.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { RenewLoanDto } from './dto/renew-loan.dto';
import { TopUpLoanDto } from './dto/topup-loan.dto';
import { PartReleaseDto } from './dto/part-release.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';

@ApiTags('loans')
@ApiBearerAuth()
@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  // ---- Customer self-service ----

  @Get('me')
  listOwnLoans(@CurrentUser() user: JwtPayloadUser) {
    this.assertCustomer(user);
    return this.loansService.listMyLoans(user.customerId!);
  }

  // ---- Staff-facing ----

  @Get()
  @RequirePermissions('loan.view')
  list(@Query() query: QueryLoanApplicationsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.listLoans(query, user);
  }

  @Get(':id')
  @Audit({ action: 'LOAN.VIEW', referenceType: 'Loan' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    // Both a customer (viewing their own loan) and staff (with loan.view) can
    // reach this; ownership/branch scoping happens inside the service, not
    // here, since a customer has no permission codes to guard against.
    if (user.userType === 'EMPLOYEE' && !user.permissions.includes('loan.view')) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
    }
    return this.loansService.getLoanDetail(id, user);
  }

  @Post(':id/collateral')
  @RequirePermissions('loan_application.view')
  @Audit({ action: 'COLLATERAL.CREATE', referenceType: 'Loan' })
  createCollateral(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateCollateralDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.createCollateral(id, dto, user);
  }

  @Post('collateral/:collateralId/appraisals')
  @RequirePermissions('appraisal.create')
  @Audit({ action: 'APPRAISAL.CREATE', referenceType: 'Collateral' })
  createAppraisal(@Param('collateralId', ParseUUIDPipe) collateralId: string, @Body() dto: CreateAppraisalDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.createAppraisal(collateralId, dto, user);
  }

  @Post('appraisals/:appraisalId/decide')
  @RequirePermissions('appraisal.approve')
  @Audit({ action: 'APPRAISAL.DECIDE', referenceType: 'Appraisal' })
  decideAppraisal(@Param('appraisalId', ParseUUIDPipe) appraisalId: string, @Body() dto: DecideAppraisalDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.decideAppraisal(appraisalId, dto, user);
  }

  @Post(':id/approve')
  @RequirePermissions('loan.approve')
  @Audit({ action: 'LOAN.APPROVE', referenceType: 'Loan' })
  decideApproval(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecideLoanApprovalDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.decideLoanApproval(id, dto, user);
  }

  @Post(':id/disburse')
  @RequirePermissions('loan.disburse')
  @Audit({ action: 'LOAN.DISBURSE', referenceType: 'Loan' })
  disburse(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.disburse(id, user);
  }

  @Post(':id/payments')
  @RequirePermissions('payment.create')
  @Audit({ action: 'PAYMENT.CREATE', referenceType: 'Loan' })
  recordPayment(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordPaymentDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.recordPayment(id, dto, user);
  }

  @Post(':id/close')
  @RequirePermissions('loan.close')
  @Audit({ action: 'LOAN.CLOSE', referenceType: 'Loan' })
  close(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.closeLoan(id, user);
  }

  @Post(':id/renew')
  @RequirePermissions('loan.renew')
  @Audit({ action: 'LOAN.RENEW', referenceType: 'Loan' })
  renew(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewLoanDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.renewLoan(id, dto, user);
  }

  @Post(':id/topup')
  @RequirePermissions('loan.topup')
  @Audit({ action: 'LOAN.TOPUP', referenceType: 'Loan' })
  topup(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TopUpLoanDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.topUpLoan(id, dto, user);
  }

  @Post(':id/part-release')
  @RequirePermissions('loan.partrelease')
  @Audit({ action: 'LOAN.PART_RELEASE', referenceType: 'Loan' })
  partRelease(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PartReleaseDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loansService.partReleaseCollateral(id, dto, user);
  }

  private assertCustomer(user: JwtPayloadUser) {
    if (user.userType !== 'CUSTOMER' || !user.customerId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, 'This endpoint is only available to customer accounts.');
    }
  }
}
