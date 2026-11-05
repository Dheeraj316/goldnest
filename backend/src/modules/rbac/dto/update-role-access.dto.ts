import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class RoleAccessChangeDto {
  @ApiProperty()
  @IsUUID()
  roleId: string;

  @ApiPropertyOptional({ type: [String], example: ['payment.create'], description: 'Permission codes to switch ON for this role' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  grant?: string[];

  @ApiPropertyOptional({ type: [String], example: ['loan.approve'], description: 'Permission codes to switch OFF for this role' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  revoke?: string[];
}

export class UpdateRoleAccessDto {
  @ApiProperty({ type: [RoleAccessChangeDto], description: 'Applied all-or-nothing; each role may appear once.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => RoleAccessChangeDto)
  changes: RoleAccessChangeDto[];
}

export class UpdateSingleRoleAccessDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  grant?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  revoke?: string[];
}
