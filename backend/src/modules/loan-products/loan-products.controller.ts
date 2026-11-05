import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LoanProductsService } from './loan-products.service';
import { CreateLoanProductDto } from './dto/create-loan-product.dto';
import { CreateInterestRuleDto } from './dto/create-interest-rule.dto';
import { CreateChargeDto } from './dto/create-charge.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('loan-products')
@ApiBearerAuth()
@Controller('loan-products')
export class LoanProductsController {
  constructor(private readonly loanProductsService: LoanProductsService) {}

  @Post()
  @RequirePermissions('loan_product.manage')
  @Audit({ action: 'LOAN_PRODUCT.CREATE', referenceType: 'LoanProduct' })
  create(@Body() dto: CreateLoanProductDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loanProductsService.create(dto, user.employeeId!);
  }

  @Get()
  @RequirePermissions('loan_product.view')
  list(@Query('activeOnly') activeOnly?: string) {
    return this.loanProductsService.list(activeOnly === 'true');
  }

  // Active product terms are shown unauthenticated on the public website too
  // (see webflow /interest-charges) — no RBAC permission required here, just
  // authentication, so the customer app can populate the apply flow.
  @Get('active')
  listActive() {
    return this.loanProductsService.listActiveWithCurrentRate();
  }

  @Get(':id')
  @RequirePermissions('loan_product.view')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanProductsService.findOne(id);
  }

  @Post(':id/interest-rules')
  @RequirePermissions('loan_product.manage')
  @Audit({ action: 'LOAN_PRODUCT.INTEREST_RULE.CREATE', referenceType: 'LoanProduct' })
  addInterestRule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateInterestRuleDto, @CurrentUser() user: JwtPayloadUser) {
    return this.loanProductsService.addInterestRule(id, dto, user.employeeId!);
  }

  @Post(':id/charges')
  @RequirePermissions('loan_product.manage')
  @Audit({ action: 'LOAN_PRODUCT.CHARGE.CREATE', referenceType: 'LoanProduct' })
  addCharge(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateChargeDto) {
    return this.loanProductsService.addCharge(id, dto);
  }
}
