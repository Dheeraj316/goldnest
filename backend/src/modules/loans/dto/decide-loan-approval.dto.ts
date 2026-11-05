import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class DecideLoanApprovalDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'REFERRED'] })
  @IsIn(['APPROVED', 'REJECTED', 'REFERRED'])
  decision: 'APPROVED' | 'REJECTED' | 'REFERRED';

  @ApiPropertyOptional({ description: 'Defaults to the appraised eligible amount, capped at the requested amount, if omitted.' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  approvedAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}
