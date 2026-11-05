import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import {
  CancelAuctionDto,
  CreateAuctionDto,
  PrepareAuctionDto,
  QueryAuctionsDto,
  RecordSaleDto,
  ScheduleAuctionDto,
  SendNoticeDto,
  SettleAuctionDto,
  WriteOffDto,
} from './dto/auctions.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';

// auction.view    — see auctions and candidates
// auction.manage  — put a loan forward, set the reserve price, send notice, schedule, cancel
// auction.approve — second-person approval (never the person who prepared it)
// auction.settle  — record the sale and pay the surplus back (two different people)
// auction.writeoff — write off what a sale left unpaid (never the person who recorded the sale)
@ApiTags('auctions')
@ApiBearerAuth()
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctions: AuctionsService) {}

  @Get()
  @RequirePermissions('auction.view')
  list(@Query() query: QueryAuctionsDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.list(query, user);
  }

  @Get('candidates')
  @RequirePermissions('auction.view')
  candidates(@CurrentUser() user: JwtPayloadUser) {
    return this.auctions.candidates(user);
  }

  @Get(':id')
  @RequirePermissions('auction.view')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.detail(id, user);
  }

  @Post()
  @RequirePermissions('auction.manage')
  @Audit({ action: 'AUCTION.CREATE', referenceType: 'Auction' })
  create(@Body() dto: CreateAuctionDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.create(dto, user);
  }

  @Post(':id/prepare')
  @RequirePermissions('auction.manage')
  @Audit({ action: 'AUCTION.PREPARE', referenceType: 'Auction' })
  prepare(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PrepareAuctionDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.prepare(id, dto, user);
  }

  @Post(':id/notices')
  @RequirePermissions('auction.manage')
  @Audit({ action: 'AUCTION.NOTICE', referenceType: 'Auction' })
  sendNotice(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SendNoticeDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.sendNotice(id, dto, user);
  }

  @Post(':id/approve')
  @RequirePermissions('auction.approve')
  @Audit({ action: 'AUCTION.APPROVE', referenceType: 'Auction' })
  approve(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.approve(id, user);
  }

  @Post(':id/schedule')
  @RequirePermissions('auction.manage')
  @Audit({ action: 'AUCTION.SCHEDULE', referenceType: 'Auction' })
  schedule(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ScheduleAuctionDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.schedule(id, dto, user);
  }

  @Post(':id/sale')
  @RequirePermissions('auction.settle')
  @Audit({ action: 'AUCTION.SALE', referenceType: 'Auction' })
  recordSale(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RecordSaleDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.recordSale(id, dto, user);
  }

  @Post(':id/settle')
  @RequirePermissions('auction.settle')
  @Audit({ action: 'AUCTION.SETTLE', referenceType: 'Auction' })
  settle(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SettleAuctionDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.settle(id, dto, user);
  }

  @Post(':id/write-off')
  @RequirePermissions('auction.writeoff')
  @Audit({ action: 'AUCTION.WRITEOFF', referenceType: 'Auction' })
  writeOff(@Param('id', ParseUUIDPipe) id: string, @Body() dto: WriteOffDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.writeOffShortfall(id, dto, user);
  }

  @Post(':id/cancel')
  @RequirePermissions('auction.manage')
  @Audit({ action: 'AUCTION.CANCEL', referenceType: 'Auction' })
  cancel(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CancelAuctionDto, @CurrentUser() user: JwtPayloadUser) {
    return this.auctions.cancel(id, dto, user);
  }
}
