import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const ALERT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const ALERT_STATUSES = ['OPEN', 'REVIEWED', 'DISMISSED', 'ESCALATED'] as const;
export const ALERT_SUBJECT_TYPES = ['CUSTOMER', 'LOAN', 'EMPLOYEE', 'COLLATERAL'] as const;
export const ALERT_DECISIONS = ['REVIEWED', 'DISMISSED', 'ESCALATED'] as const;

// Starting thresholds only — not a lender's approved risk policy. Each one needs compliance
// sign-off before production, the same as the auctions module's minimum-days/reserve-percent.
export const RISK_RULES = {
  HIGH_LTV: { severity: 'MEDIUM' as const, thresholdPercent: 75, label: 'Approved above 75% loan-to-value' },
  LARGE_LOAN: { severity: 'MEDIUM' as const, thresholdAmount: 500000, label: 'Principal at or above ₹5,00,000' },
  MULTIPLE_ACTIVE_LOANS: { severity: 'HIGH' as const, thresholdCount: 3, label: 'Three or more loans open at once' },
  SEVERELY_OVERDUE: { severity: 'HIGH' as const, thresholdDays: 45, label: 'More than 45 days past due, not yet at auction' },
  RAPID_REBORROW: { severity: 'LOW' as const, thresholdDays: 7, label: 'A new loan within 7 days of closing the last one' },
};

export class ReviewAlertDto {
  @ApiProperty({ enum: ALERT_DECISIONS })
  @IsIn(ALERT_DECISIONS)
  decision: (typeof ALERT_DECISIONS)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 500)
  note?: string;
}

export class QueryAlertsDto {
  @ApiPropertyOptional({ enum: ALERT_STATUSES })
  @IsOptional()
  @IsIn(ALERT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ enum: ALERT_SEVERITIES })
  @IsOptional()
  @IsIn(ALERT_SEVERITIES)
  severity?: string;

  @ApiPropertyOptional({ enum: ALERT_SUBJECT_TYPES })
  @IsOptional()
  @IsIn(ALERT_SUBJECT_TYPES)
  subjectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

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
