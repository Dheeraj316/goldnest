import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { DeviceInfoDto } from './device-info.dto';

export class EmployeeLoginDto {
  @ApiProperty({ example: 'employee@company.com or mobile number' })
  @IsString()
  identifier: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ required: false, description: 'Required if MFA is enabled for this account' })
  @IsOptional()
  @IsString()
  mfaCode?: string;

  @ApiProperty({ type: DeviceInfoDto })
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device: DeviceInfoDto;
}
