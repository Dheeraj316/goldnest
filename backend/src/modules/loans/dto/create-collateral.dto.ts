import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreateCollateralItemDto {
  @ApiProperty({ example: 'NECKLACE' })
  @IsString()
  itemType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Grams' })
  @IsNumber()
  @Min(0.001)
  grossWeight: number;

  @ApiPropertyOptional({ description: 'Grams — stones/non-gold deductions', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stoneWeight?: number;

  @ApiProperty({ description: 'Grams — grossWeight minus stoneWeight, validated server-side' })
  @IsNumber()
  @Min(0.001)
  netWeight: number;

  @ApiProperty({ description: 'Karat, e.g. 22', example: 22 })
  @IsNumber()
  @Min(1)
  purityKarat: number;
}

export class CreateCollateralDto {
  @ApiProperty({ type: [CreateCollateralItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateCollateralItemDto)
  items: CreateCollateralItemDto[];
}
