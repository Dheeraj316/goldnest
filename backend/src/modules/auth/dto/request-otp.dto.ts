import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, { message: 'mobile must be a valid 10-digit Indian mobile number' })
  mobile: string;

  @ApiProperty({ enum: ['REGISTRATION', 'LOGIN'] })
  @IsIn(['REGISTRATION', 'LOGIN'])
  purpose: 'REGISTRATION' | 'LOGIN';
}
