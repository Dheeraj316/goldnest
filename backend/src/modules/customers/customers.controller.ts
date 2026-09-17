import { Body, Controller, Get, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { QueryCustomersDto } from './dto/query-customers.dto';
import { ReviewKycDto } from './dto/review-kyc.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ---- Customer self-service (mobile app) ----

  @Get('me')
  getOwnProfile(@CurrentUser() user: JwtPayloadUser) {
    this.assertCustomer(user);
    return this.customersService.getOwnProfile(user.customerId!);
  }

  @Patch('me')
  @Audit({ action: 'CUSTOMER.PROFILE.UPDATE', referenceType: 'Customer' })
  updateOwnProfile(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateCustomerProfileDto) {
    this.assertCustomer(user);
    return this.customersService.updateOwnProfile(user.customerId!, dto);
  }

  @Post('me/kyc')
  @Audit({ action: 'CUSTOMER.KYC.SUBMIT', referenceType: 'Customer' })
  submitOwnKyc(@CurrentUser() user: JwtPayloadUser, @Body() dto: SubmitKycDto) {
    this.assertCustomer(user);
    return this.customersService.submitOwnKyc(user.customerId!, dto);
  }

  // ---- Staff-facing (business app / admin) ----

  @Get()
  @RequirePermissions('customer.view')
  search(@Query() query: QueryCustomersDto, @CurrentUser() user: JwtPayloadUser) {
    return this.customersService.search(query, user);
  }

  @Get(':id')
  @RequirePermissions('customer.view')
  @Audit({ action: 'CUSTOMER.VIEW', referenceType: 'Customer' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.customersService.findOneForStaff(id, user);
  }

  @Patch('kyc/:kycRecordId/review')
  @RequirePermissions('customer.kyc.verify')
  @Audit({ action: 'CUSTOMER.KYC.REVIEW', referenceType: 'KycRecord' })
  reviewKyc(@Param('kycRecordId', ParseUUIDPipe) kycRecordId: string, @Body() dto: ReviewKycDto, @CurrentUser() user: JwtPayloadUser) {
    return this.customersService.reviewKyc(kycRecordId, dto, user);
  }

  private assertCustomer(user: JwtPayloadUser) {
    if (user.userType !== 'CUSTOMER' || !user.customerId) {
      throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN, 'This endpoint is only available to customer accounts.');
    }
  }
}
