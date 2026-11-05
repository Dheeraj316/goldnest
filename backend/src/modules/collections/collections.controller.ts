import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { AssignCaseDto, CreatePromiseDto, LogActivityDto, QueryCasesDto } from './dto/collections.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('collections')
@ApiBearerAuth()
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  @Get('summary')
  @RequirePermissions('collection.view')
  summary(@CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.summary(user);
  }

  @Get('cases')
  @RequirePermissions('collection.view')
  list(@Query() query: QueryCasesDto, @CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.listCases(query, user);
  }

  @Get('cases/:id')
  @RequirePermissions('collection.view')
  detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.getCase(id, user);
  }

  @Get('cases/:id/assignees')
  @RequirePermissions('collection.assign')
  assignees(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.listAssignees(id, user);
  }

  @Post('cases/:id/activities')
  @RequirePermissions('collection.manage')
  @Audit({ action: 'COLLECTION.ACTIVITY', referenceType: 'CollectionCase' })
  logActivity(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LogActivityDto, @CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.logActivity(id, dto, user);
  }

  @Post('cases/:id/promises')
  @RequirePermissions('collection.manage')
  @Audit({ action: 'COLLECTION.PROMISE', referenceType: 'CollectionCase' })
  createPromise(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreatePromiseDto, @CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.createPromise(id, dto, user);
  }

  @Patch('cases/:id/assign')
  @RequirePermissions('collection.assign')
  @Audit({ action: 'COLLECTION.ASSIGN', referenceType: 'CollectionCase' })
  assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignCaseDto, @CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.assign(id, dto, user);
  }

  // Same job the nightly scheduler runs; idempotent, so safe to trigger by hand.
  @Post('sweep')
  @RequirePermissions('collection.assign')
  @Audit({ action: 'COLLECTION.SWEEP', referenceType: 'CollectionCase' })
  sweep(@CurrentUser() user: JwtPayloadUser) {
    return this.collectionsService.runSweep(user.employeeId);
  }
}
