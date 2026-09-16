import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsEmail, IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class CreateBranchDto {
  @ApiProperty()
  @IsUUID()
  organizationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiProperty({ example: 'BLR01' })
  @IsString()
  @Matches(/^[A-Z0-9]{3,10}$/, { message: 'code must be 3-10 uppercase alphanumeric characters' })
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty()
  @IsString()
  city: string;

  @ApiProperty()
  @IsString()
  state: string;

  @ApiProperty()
  @IsString()
  @Matches(/^\d{6}$/)
  pinCode: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Configurable per-branch cash-handling limit (spec #38)' })
  @IsOptional()
  @IsDecimal()
  cashLimit?: string;
}
