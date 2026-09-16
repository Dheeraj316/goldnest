import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyRegistrationOtpDto } from './dto/verify-registration-otp.dto';
import { CompleteCustomerRegistrationDto } from './dto/complete-customer-registration.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---- Customer registration ----

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('customer/otp/request')
  @ApiOperation({ summary: 'Request an OTP for customer registration or login' })
  requestCustomerOtp(@Body() dto: RequestOtpDto, @Req() req: Request) {
    return this.authService.requestCustomerOtp(dto, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('customer/otp/verify-registration')
  @ApiOperation({ summary: 'Verify the registration OTP before submitting the full registration form' })
  verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto) {
    return this.authService.verifyRegistrationOtp(dto.mobile, dto.code);
  }

  @Public()
  @Post('customer/register')
  @ApiOperation({ summary: 'Complete customer registration (requires a recently verified OTP)' })
  completeCustomerRegistration(@Body() dto: CompleteCustomerRegistrationDto, @Req() req: Request) {
    return this.authService.completeCustomerRegistration(dto, req.ip);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('customer/login')
  @ApiOperation({ summary: 'Customer login via mobile + OTP' })
  customerLogin(@Body() dto: CustomerLoginDto, @Req() req: Request) {
    return this.authService.customerLogin(dto, req.ip);
  }

  // ---- Employee login ----

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('employee/login')
  @ApiOperation({ summary: 'Employee (business app / admin) login via identifier + password (+MFA)' })
  employeeLogin(@Body() dto: EmployeeLoginDto, @Req() req: Request) {
    return this.authService.employeeLogin(dto, req.ip);
  }

  // ---- Session ----

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token for a new access/refresh token pair' })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, req.ip);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'Log out the current device' })
  async logout(@CurrentUser() user: JwtPayloadUser) {
    await this.authService.logout(user.userId, user.deviceId);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  @ApiOperation({ summary: 'Log out of all devices' })
  async logoutAll(@CurrentUser() user: JwtPayloadUser) {
    await this.authService.logoutAllDevices(user.userId);
  }

  @ApiBearerAuth()
  @Get('devices')
  @ApiOperation({ summary: 'List active devices for the current account' })
  listDevices(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.listDevices(user.userId);
  }

  // ---- MFA enrollment (employees) ----

  @ApiBearerAuth()
  @Post('mfa/setup')
  @ApiOperation({ summary: 'Begin MFA enrollment — returns a TOTP secret and otpauth:// URL for an authenticator app' })
  setupMfa(@CurrentUser() user: JwtPayloadUser) {
    return this.authService.setupMfa(user.userId);
  }

  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('mfa/confirm')
  @ApiOperation({ summary: 'Confirm MFA enrollment with a code from the authenticator app' })
  async confirmMfa(@CurrentUser() user: JwtPayloadUser, @Body('code') code: string) {
    await this.authService.confirmMfa(user.userId, code);
  }
}
