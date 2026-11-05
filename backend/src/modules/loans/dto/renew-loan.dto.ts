import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

// Renewal settles whatever interest/charges have accrued so far (never
// principal — that's what makes this a renewal and not a closure) and rolls
// the loan into a fresh term. paymentAmount may exceed interest+charges: any
// surplus is applied as a voluntary principal reduction carried into the new
// loan, same "excess beyond what's owed is rejected, not silently absorbed"
// posture as recordPayment — see loans.service.ts#renewLoan.
export class RenewLoanDto {
  @ApiProperty({ description: 'Must cover at least the outstanding interest + charges; any surplus reduces principal.' })
  @IsNumber()
  @Min(0.01)
  paymentAmount: number;

  @ApiProperty({ enum: ['CASH', 'OTHER'] })
  @IsIn(['CASH', 'OTHER'])
  paymentMode: string;

  @ApiPropertyOptional({ description: "Defaults to the original loan's own tenure length if omitted." })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3650)
  newTenureDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
