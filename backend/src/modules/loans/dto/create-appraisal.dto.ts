import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateNested } from 'class-validator';

export class AppraisalItemInputDto {
  @ApiProperty()
  @IsUUID()
  collateralItemId: string;

  @ApiPropertyOptional({ description: 'Overrides the collateral item net weight if the appraiser measures differently — defaults to the recorded net weight.' })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  netGoldWeight?: number;

  @ApiPropertyOptional({ description: 'Overrides the recorded purity if re-tested.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  purityKarat?: number;
}

// Deliberately no `valuation` or `eligibleLoanValue` field anywhere in this
// DTO — those are always server-computed from goldRatePerGram + the
// product's LTV, never accepted from the client (spec #116/#194: "Never
// trust client-side financial calculations").
export class CreateAppraisalDto {
  @ApiProperty({ description: 'Rate per gram of 24k gold, as of today' })
  @IsNumber()
  @Min(1)
  goldRatePerGram: number;

  @ApiProperty({ type: [AppraisalItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AppraisalItemInputDto)
  items: AppraisalItemInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
