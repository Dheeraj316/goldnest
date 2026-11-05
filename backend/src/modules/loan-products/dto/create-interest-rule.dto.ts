import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsOptional, Min } from 'class-validator';

export enum InterestMethodDto {
  FLAT = 'FLAT',
  REDUCING_BALANCE = 'REDUCING_BALANCE',
}

// A new rule row is how a rate change is versioned — never mutate a rule that
// has already been used to accrue interest on a live loan (spec #124).
export class CreateInterestRuleDto {
  @ApiProperty({ enum: InterestMethodDto })
  @IsEnum(InterestMethodDto)
  method: InterestMethodDto;

  @ApiProperty({ example: 12 })
  @IsNumber()
  @Min(0)
  annualRatePercent: number;

  @ApiProperty({ enum: ['DAILY', 'MONTHLY'] })
  @IsIn(['DAILY', 'MONTHLY'])
  accrualFrequency: string;

  @ApiProperty({ enum: ['MONTHLY', 'ON_CLOSURE', 'CUSTOM'] })
  @IsIn(['MONTHLY', 'ON_CLOSURE', 'CUSTOM'])
  paymentFrequency: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  penalRatePercent?: number;
}
