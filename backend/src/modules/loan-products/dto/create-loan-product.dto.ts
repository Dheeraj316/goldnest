import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export enum ProductTypeDto {
  GOLD_LOAN = 'GOLD_LOAN',
  OTHER_SECURED = 'OTHER_SECURED',
}

export class CreateLoanProductDto {
  @ApiProperty({ example: 'GL-STD' })
  @IsString()
  @Matches(/^[A-Z0-9-]{2,20}$/)
  code: string;

  @ApiProperty({ example: 'Gold Loan Standard' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ProductTypeDto })
  @IsEnum(ProductTypeDto)
  type: ProductTypeDto;

  @ApiProperty({ description: 'Maximum loan-to-value percentage, e.g. 75', example: 75 })
  @IsNumber()
  @Min(1)
  @Max(100)
  maxLtvPercent: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  minLoanAmount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  maxLoanAmount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  minTenureDays: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  maxTenureDays: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;
}
