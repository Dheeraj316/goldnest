import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// Phase B only supports manual/cash recording (a cashier keying in a
// physical-cash or branch-counter payment). Gateway-initiated payments
// (UPI/netbanking/card, webhook-verified) are Phase C — a real payment
// gateway integration is out of scope until a provider is chosen (spec #62,
// #136: "do not hard-code a single provider").
export class RecordPaymentDto {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: ['CASH', 'OTHER'] })
  @IsIn(['CASH', 'OTHER'])
  mode: string;

  @ApiPropertyOptional({ description: 'Client-supplied idempotency key. A server-generated one is used if omitted.' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
