import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('branches')
@ApiBearerAuth()
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @RequirePermissions('branch.manage')
  @Audit({ action: 'BRANCH.CREATE', referenceType: 'Branch' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @RequirePermissions('branch.view')
  findAll(@CurrentUser() user: JwtPayloadUser) {
    return this.branchesService.findAll(user);
  }

  // No RBAC permission required — just authentication — so the customer app
  // can list branches to apply at (customers hold no permission codes).
  @Get('active')
  listActive() {
    return this.branchesService.listActive();
  }

  @Get(':id')
  @RequirePermissions('branch.view')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayloadUser) {
    return this.branchesService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('branch.manage')
  @Audit({ action: 'BRANCH.UPDATE', referenceType: 'Branch' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('branch.manage')
  @Audit({ action: 'BRANCH.DEACTIVATE', referenceType: 'Branch' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.branchesService.deactivate(id);
  }
}
