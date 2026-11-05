import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'Limit the report to one branch (cross-branch roles only; others are pinned to their own).' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class TrendQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ default: 30, minimum: 7, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(7)
  @Max(90)
  days: number = 30;
}
