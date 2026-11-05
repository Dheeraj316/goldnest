import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length } from 'class-validator';

export const CASH_ENTRY_TYPES = ['RECEIPT', 'DISBURSEMENT', 'TRANSFER'] as const;

export class OpenCashRegisterDto {
  @ApiProperty({ description: 'The opening float counted in the drawer.' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class RecordCashEntryDto {
  @ApiProperty({ enum: CASH_ENTRY_TYPES })
  @IsIn(CASH_ENTRY_TYPES)
  type: (typeof CASH_ENTRY_TYPES)[number];

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ description: 'What this entry is for — a loan/payment number, a bank-deposit slip number, etc. Free text, not a system link.' })
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class CloseCashRegisterDto {
  @ApiProperty({ description: 'The closing float actually counted in the drawer.' })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 200)
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class QueryCashDayDto {
  @ApiPropertyOptional({ description: 'Defaults to today (IST calendar day).' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class QueryCashHistoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page: number = 1;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  pageSize: number = 30;
}
