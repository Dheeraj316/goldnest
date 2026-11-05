import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Query, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { DocumentsService, RenderedDocument } from './documents.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';

function pdf(res: Response, doc: RenderedDocument, disposition: 'inline' | 'attachment' = 'inline') {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return new StreamableFile(doc.bytes, { type: 'application/pdf', disposition: `${disposition}; filename="${doc.filename}"`, length: doc.bytes.length });
}

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  // ---- direct downloads (Authorization header; used by the admin console) ----------------------------

  @Get('receipts/:id/pdf')
  @Audit({ action: 'RECEIPT.DOWNLOAD', referenceType: 'Receipt' })
  async receipt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return pdf(res, await this.documents.receipt(id, user));
  }

  @Get('loans/:id/statement/pdf')
  @Audit({ action: 'STATEMENT.DOWNLOAD', referenceType: 'Loan' })
  async statement(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return pdf(res, await this.documents.statement(id, user));
  }

  @Get('auctions/:id/notice/pdf')
  @Audit({ action: 'AUCTION_NOTICE.DOWNLOAD', referenceType: 'Auction' })
  async auctionNotice(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return pdf(res, await this.documents.auctionNotice(id, user));
  }

  // ---- short-lived links (mobile apps open these in a browser / PDF viewer) --------------------------

  @Post('receipts/:id/link')
  @Audit({ action: 'RECEIPT.LINK', referenceType: 'Receipt' })
  receiptLink(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.documents.createLink('receipt', id, user);
  }

  @Post('loans/:id/statement-link')
  @Audit({ action: 'STATEMENT.LINK', referenceType: 'Loan' })
  statementLink(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.documents.createLink('statement', id, user);
  }

  @Post('auctions/:id/notice-link')
  @Audit({ action: 'AUCTION_NOTICE.LINK', referenceType: 'Auction' })
  auctionNoticeLink(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.documents.createLink('auction_notice', id, user);
  }

  /** No login header: the signed token is the credential. Rate-limited, and it only ever serves the one document it names. */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('download')
  async download(@Query('t') token: string, @Res({ passthrough: true }) res: Response) {
    res.status(HttpStatus.OK);
    return pdf(res, await this.documents.redeem(token));
  }
}
