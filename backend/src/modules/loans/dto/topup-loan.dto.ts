import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Top-up re-values the same pledged gold at today's rate (spec #48/#64) —
// no new collateral, no new loan row, just additional eligible credit on
// the existing loan. Deliberately no `eligibleAmount`/`valuation` field:
// those are always server-computed from goldRatePerGram + the collateral's
// recorded weight/purity + the loan's approved LTV, exactly like the
// original appraisal (spec #116/#194: never trust client-side financial
// calculations).
export class TopUpLoanDto {
  @ApiProperty({ description: "Rate per gram of 24k gold, as of today — used to re-value the existing pledge." })
  @IsNumber()
  @Min(1)
  goldRatePerGram: number;

  @ApiPropertyOptional({ description: 'Caps the top-up below the full eligible amount if the customer wants less. Defaults to the full eligible top-up.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  requestedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
