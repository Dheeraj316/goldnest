import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, Length } from 'class-validator';

export const ENQUIRY_SOURCE_PAGES = ['contact', 'gold-loan', 'home', 'eligibility', 'branch-locator'] as const;

export class CreateEnquiryDto {
  @ApiProperty()
  @IsString()
  @Length(2, 120)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(6, 20)
  phone?: string;

  @ApiProperty()
  @IsString()
  @Length(5, 2000)
  message: string;

  @ApiProperty({ enum: ENQUIRY_SOURCE_PAGES })
  @IsIn(ENQUIRY_SOURCE_PAGES)
  sourcePage: string;
}
