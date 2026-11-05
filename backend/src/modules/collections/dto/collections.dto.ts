import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBooleanString, IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const ACTIVITY_TYPES = ['CALL', 'VISIT', 'SMS', 'NOTICE', 'NOTE'] as const;
export const ACTIVITY_OUTCOMES = ['REACHED', 'NO_ANSWER', 'REFUSED', 'PROMISED', 'WRONG_NUMBER', 'OTHER'] as const;
export const CASE_STATUSES = ['OPEN', 'CLOSED'] as const;

export class QueryCasesDto {
  @ApiPropertyOptional({ enum: CASE_STATUSES, default: 'OPEN' })
  @IsOptional()
  @IsIn(CASE_STATUSES)
  status: string = 'OPEN';

  @ApiPropertyOptional({ description: 'Only cases assigned to the calling employee.' })
  @IsOptional()
  @IsBooleanString()
  assignedToMe?: string;

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

export class LogActivityDto {
  @ApiProperty({ enum: ACTIVITY_TYPES })
  @IsIn(ACTIVITY_TYPES)
  type: string;

  @ApiPropertyOptional({ enum: ACTIVITY_OUTCOMES })
  @IsOptional()
  @IsIn(ACTIVITY_OUTCOMES)
  outcome?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notes?: string;
}

export class CreatePromiseDto {
  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  promisedAmount: number;

  @ApiProperty({ description: 'Calendar date (YYYY-MM-DD) the customer promised to pay by.' })
  @IsDateString({ strict: true })
  promisedDate: string;
}

export class AssignCaseDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;
}
