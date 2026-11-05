import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const VAULT_LOCATION_TYPES = ['LOCKER', 'SHELF', 'BIN'] as const;
export const PACKET_STATUSES = ['RECEIVED', 'STORED', 'MOVED', 'AUDITED', 'RELEASED', 'AUCTIONED', 'DESTROYED'] as const;

export class CreateVaultDto {
  @ApiProperty({ example: 'Head Office Strongroom' })
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiPropertyOptional({ description: 'Defaults to the caller’s own branch; only a cross-branch role may set another.' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class CreateVaultLocationDto {
  @ApiProperty({ enum: VAULT_LOCATION_TYPES })
  @IsIn(VAULT_LOCATION_TYPES)
  type: (typeof VAULT_LOCATION_TYPES)[number];

  @ApiProperty({ example: 'L-04' })
  @IsString()
  @Length(1, 40)
  code: string;

  @ApiPropertyOptional({ description: 'Another location in the same vault this one sits inside (e.g. a shelf inside a locker).' })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class SealPacketDto {
  @ApiProperty({ description: 'The collateral to seal into a tamper-evident packet.' })
  @IsUUID()
  collateralId: string;
}

export class StorePacketDto {
  @ApiProperty()
  @IsUUID()
  vaultLocationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class MovePacketDto {
  @ApiProperty()
  @IsUUID()
  vaultLocationId: string;

  @ApiProperty({ description: 'Why the packet is moving.' })
  @IsString()
  @Length(3, 300)
  reason: string;
}

export class AuditPacketDto {
  @ApiProperty({ description: 'Whether the packet was physically found where records say it is.' })
  @IsBoolean()
  present: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 300)
  notes?: string;
}

export class CloseOutPacketDto {
  @ApiPropertyOptional({ description: 'Kept on the movement record.' })
  @IsOptional()
  @IsString()
  @Length(0, 300)
  reason?: string;
}

export class QueryPacketsDto {
  @ApiPropertyOptional({ enum: PACKET_STATUSES })
  @IsOptional()
  @IsIn(PACKET_STATUSES)
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  vaultLocationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Packet number, seal number, loan number or customer name.' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 25;
}
