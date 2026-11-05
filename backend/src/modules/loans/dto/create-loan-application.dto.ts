import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateLoanApplicationDto {
  @ApiPropertyOptional({ description: 'Required when a staff member creates the application on a customer\'s behalf; ignored (taken from the token) for customer self-service.' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ description: 'Branch the customer wants to be served at — also the first place a customer is actually assigned to a branch.' })
  @IsUUID()
  branchId: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  requestedAmount: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(3650)
  requestedTenureDays: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  purpose?: string;
}
