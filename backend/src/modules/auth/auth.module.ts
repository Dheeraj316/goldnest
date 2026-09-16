import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OtpService } from './services/otp.service';
import { SmsService } from './services/sms.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RbacModule } from '../rbac/rbac.module';
import { NumberGeneratorModule } from '../number-generator/number-generator.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), RbacModule, NumberGeneratorModule],
  controllers: [AuthController],
  providers: [AuthService, OtpService, SmsService, TokenService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
