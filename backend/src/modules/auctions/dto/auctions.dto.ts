import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const AUCTION_STATUSES = ['CANDIDATE', 'UNDER_REVIEW', 'NOTICE_SENT', 'NOTICE_PERIOD', 'APPROVED', 'SCHEDULED', 'COMPLETED', 'SETTLED', 'CANCELLED'] as const;
export const NOTICE_CHANNELS = ['SMS', 'EMAIL', 'POST', 'PUSH'] as const;
export const PAYOUT_MODES = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE'] as const;

export class QueryAuctionsDto {
  @ApiPropertyOptional({ enum: AUCTION_STATUSES })
  @IsOptional()
  @IsIn(AUCTION_STATUSES as unknown as string[])
  status?: (typeof AUCTION_STATUSES)[number];

  @ApiPropertyOptional({ description: 'Only auctions still in progress (not completed, settled or cancelled).' })
  @IsOptional()
  @IsIn(['true', 'false'])
  open?: string;

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

export class CreateAuctionDto {
  @ApiProperty()
  @IsUUID()
  loanId: string;
}

export class PrepareAuctionDto {
  @ApiProperty({ example: 6500, description: "Today's market price of 24k gold, per gram." })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000)
  goldRatePerGram: number;
}

export class SendNoticeDto {
  @ApiProperty({ enum: NOTICE_CHANNELS, isArray: true, example: ['SMS', 'POST'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(NOTICE_CHANNELS as unknown as string[], { each: true })
  channels: (typeof NOTICE_CHANNELS)[number][];
}

export class ScheduleAuctionDto {
  @ApiProperty({ example: '2026-10-15', description: 'Calendar date of the auction (today or later).' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'scheduledDate must be a date in YYYY-MM-DD form' })
  scheduledDate: string;

  @ApiPropertyOptional({ example: 'Head Office, MG Road' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  venue?: string;
}

export class BidDto {
  @ApiProperty({ example: 'Sri Lakshmi Jewellers' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bidderName: string;

  @ApiProperty({ example: 34500 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(1_000_000_000)
  bidAmount: number;
}

export class RecordSaleDto {
  @ApiProperty({ type: [BidDto], description: 'Every bid received. The highest wins; a tie at the top is refused.' })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => BidDto)
  bids: BidDto[];
}

export class SettleAuctionDto {
  @ApiProperty({ enum: PAYOUT_MODES })
  @IsIn(PAYOUT_MODES as unknown as string[])
  mode: (typeof PAYOUT_MODES)[number];

  @ApiPropertyOptional({ example: 'UTR 4021xxxx' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;
}

export class WriteOffDto {
  @ApiProperty({ example: 'Borrower untraceable; recovery not expected' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}

export class CancelAuctionDto {
  @ApiProperty({ example: 'Borrower has arranged payment' })
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  reason: string;
}
