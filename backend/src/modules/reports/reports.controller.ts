import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto, TrendQueryDto } from './dto/reports.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

function sendCsv(res: Response, name: string, body: string) {
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="goldnest-${name}-${stamp}.csv"`);
  return body;
}

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('portfolio')
  @RequirePermissions('report.view')
  portfolio(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reports.portfolio(user, q.branchId);
  }

  @Get('aging')
  @RequirePermissions('report.view')
  aging(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reports.aging(user, q.branchId);
  }

  @Get('branches')
  @RequirePermissions('report.view')
  branches(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reports.branches(user, q.branchId);
  }

  @Get('trend')
  @RequirePermissions('report.view')
  trend(@Query() q: TrendQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reports.trend(user, q.days, q.branchId);
  }

  @Get('collections')
  @RequirePermissions('report.view')
  collections(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reports.collections(user, q.branchId);
  }

  @Get('auctions')
  @RequirePermissions('report.view')
  auctions(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser) {
    return this.reports.auctions(user, q.branchId);
  }

  // ---- CSV exports (each one is audited: a bulk download of loan data is a sensitive action) ----

  @Get('aging/export')
  @RequirePermissions('report.view')
  @Audit({ action: 'REPORT.EXPORT.AGING', referenceType: 'Report' })
  async agingExport(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return sendCsv(res, 'overdue-aging', await this.reports.agingCsv(user, q.branchId));
  }

  @Get('branches/export')
  @RequirePermissions('report.view')
  @Audit({ action: 'REPORT.EXPORT.BRANCHES', referenceType: 'Report' })
  async branchesExport(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return sendCsv(res, 'branch-summary', await this.reports.branchesCsv(user, q.branchId));
  }

  @Get('auctions/export')
  @RequirePermissions('report.view')
  @Audit({ action: 'REPORT.EXPORT.AUCTIONS', referenceType: 'Report' })
  async auctionsExport(@Query() q: ReportQueryDto, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return sendCsv(res, 'auctions', await this.reports.auctionsCsv(user, q.branchId));
  }

  @Get('trend/export')
  @RequirePermissions('report.view')
  @Audit({ action: 'REPORT.EXPORT.TREND', referenceType: 'Report' })
  async trendExport(@Query() q: TrendQueryDto, @CurrentUser() user: JwtPayloadUser, @Res({ passthrough: true }) res: Response) {
    return sendCsv(res, 'disbursed-vs-collected', await this.reports.trendCsv(user, q.days, q.branchId));
  }
}
