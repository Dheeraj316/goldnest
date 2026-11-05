import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export const TICKET_CATEGORIES = ['LOAN', 'PAYMENT', 'KYC', 'COMPLAINT', 'GENERAL'] as const;
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const TICKET_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED'] as const;

// Operational SLA targets, not a regulatory obligation — a sensible starting point for how quickly each
// priority should get a resolution, editable in code until this earns its own Configuration entry.
export const SLA_HOURS: Record<(typeof TICKET_PRIORITIES)[number], number> = { CRITICAL: 4, HIGH: 24, MEDIUM: 72, LOW: 168 };

export class CreateTicketDto {
  @ApiProperty({ enum: TICKET_CATEGORIES })
  @IsIn(TICKET_CATEGORIES)
  category: (typeof TICKET_CATEGORIES)[number];

  @ApiPropertyOptional({ enum: TICKET_PRIORITIES, default: 'MEDIUM' })
  @IsOptional()
  @IsIn(TICKET_PRIORITIES)
  priority?: (typeof TICKET_PRIORITIES)[number];

  @ApiProperty()
  @IsString()
  @Length(5, 2000)
  description: string;

  @ApiPropertyOptional({ description: 'A loan this is about, if any. Must belong to the same customer.' })
  @IsOptional()
  @IsUUID()
  loanId?: string;

  // Staff raising a ticket on a customer's behalf (e.g. a phone call) must say who it is for; a customer
  // raising their own is identified from their session and may not name someone else.
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  customerId?: string;
}

export class AssignTicketDto {
  @ApiProperty()
  @IsUUID()
  employeeId: string;
}

export class WaitingForCustomerDto {
  @ApiPropertyOptional({ description: 'What is being waited on.' })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  note?: string;
}

export class ResolveTicketDto {
  @ApiProperty()
  @IsString()
  @Length(5, 2000)
  resolutionNote: string;
}

export class QueryTicketsDto {
  @ApiPropertyOptional({ enum: TICKET_STATUSES })
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Only tickets assigned to the calling employee.' })
  @IsOptional()
  @IsIn(['true', 'false'])
  assignedToMe?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

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
