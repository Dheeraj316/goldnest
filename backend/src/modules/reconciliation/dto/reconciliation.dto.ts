import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, IsUUID, Length, Max, Min, ValidateNested } from 'class-validator';

export class BankTransactionLineDto {
  @ApiProperty({ description: 'The bank statement\'s own reference for this line.' })
  @IsString()
  @Length(1, 120)
  bankRef: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty()
  @IsDateString()
  valueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 300)
  description?: string;
}

export class ImportBankTransactionsDto {
  @ApiProperty({ type: [BankTransactionLineDto], description: 'One or more statement lines, entered by hand until a real file-import format is wired up.' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BankTransactionLineDto)
  transactions: BankTransactionLineDto[];
}

export class ManualMatchDto {
  @ApiProperty({ description: 'The FinancialTransaction this bank line corresponds to.' })
  @IsUUID()
  financialTransactionId: string;
}

export class QueryBankTransactionsDto {
  // `enableImplicitConversion` on the global ValidationPipe runs Boolean(value) before any @Transform
  // sees `value` — and Boolean("false") is true. Reading the untouched raw value off `obj` instead
  // sidesteps that entirely.
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ obj }) => (obj.matched === undefined ? undefined : obj.matched === 'true' || obj.matched === true))
  @IsBoolean()
  matched?: boolean;

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
