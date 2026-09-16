import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { RequestSettingChangeDto } from './dto/request-setting-change.dto';
import { DecideSettingChangeDto } from './dto/decide-setting-change.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('setting.view')
  list(@Query('scope') scope?: string, @Query('scopeId') scopeId?: string) {
    return this.settingsService.list(scope, scopeId);
  }

  @Get('pending-changes')
  @RequirePermissions('setting.approve')
  listPendingChanges() {
    return this.settingsService.listPendingChanges();
  }

  @Post('changes')
  @RequirePermissions('setting.manage')
  @Audit({ action: 'SETTING.CHANGE.REQUEST', referenceType: 'Setting' })
  requestChange(@Body() dto: RequestSettingChangeDto, @CurrentUser() user: JwtPayloadUser) {
    return this.settingsService.requestChange(dto, user.userId);
  }

  @Patch('changes/:versionId/approve')
  @RequirePermissions('setting.approve')
  @Audit({ action: 'SETTING.CHANGE.APPROVE', referenceType: 'ConfigurationVersion' })
  approveChange(@Param('versionId', ParseUUIDPipe) versionId: string, @CurrentUser() user: JwtPayloadUser) {
    return this.settingsService.approveChange(versionId, user.userId);
  }

  @Patch('changes/:versionId/reject')
  @RequirePermissions('setting.approve')
  @Audit({ action: 'SETTING.CHANGE.REJECT', referenceType: 'ConfigurationVersion' })
  rejectChange(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: DecideSettingChangeDto,
    @CurrentUser() user: JwtPayloadUser,
  ) {
    return this.settingsService.rejectChange(versionId, user.userId, dto.reason);
  }
}
