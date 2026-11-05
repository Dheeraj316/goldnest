import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNumber, IsString, Min } from 'class-validator';

export class CreateChargeDto {
  @ApiProperty({ example: 'PROCESSING_FEE' })
  @IsString()
  code: string;

  @ApiProperty({ example: 'Processing Fee' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['FLAT', 'PERCENT_OF_PRINCIPAL'] })
  @IsIn(['FLAT', 'PERCENT_OF_PRINCIPAL'])
  calcType: string;

  @ApiProperty({ description: 'Flat amount, or percentage points if calcType is PERCENT_OF_PRINCIPAL', example: 1 })
  @IsNumber()
  @Min(0)
  amount: number;
}
