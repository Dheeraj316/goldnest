import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'CLOSED'] as const;

export class UpdateEnquiryStatusDto {
  @ApiProperty({ enum: ENQUIRY_STATUSES })
  @IsIn(ENQUIRY_STATUSES)
  status: string;
}
