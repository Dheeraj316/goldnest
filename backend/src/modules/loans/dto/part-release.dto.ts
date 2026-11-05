import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class PartReleaseDto {
  @ApiProperty({ description: 'Collateral items to hand back to the customer now.', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  itemIds: string[];

  @ApiProperty({ description: "Rate per gram of 24k gold, as of today — used to re-value the gold that STAYS pledged." })
  @IsNumber()
  @Min(1)
  goldRatePerGram: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
