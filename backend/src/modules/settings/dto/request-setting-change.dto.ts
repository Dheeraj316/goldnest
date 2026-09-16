import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const SCOPES = ['GLOBAL', 'ORGANIZATION', 'BRANCH', 'PRODUCT'] as const;
const DATA_TYPES = ['NUMBER', 'STRING', 'BOOLEAN', 'JSON'] as const;

export class RequestSettingChangeDto {
  @ApiProperty({ example: 'MAX_LTV_PERCENT' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ enum: SCOPES, default: 'GLOBAL' })
  @IsOptional()
  @IsIn(SCOPES)
  scope?: (typeof SCOPES)[number];

  @ApiPropertyOptional({ description: 'Required when scope is not GLOBAL — e.g. a branch or product ID' })
  @IsOptional()
  @IsUUID()
  scopeId?: string;

  @ApiProperty({ enum: DATA_TYPES })
  @IsIn(DATA_TYPES)
  dataType: (typeof DATA_TYPES)[number];

  @ApiProperty({ description: 'New value — validated against dataType' })
  @IsDefined()
  value: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  changeReason?: string;
}
