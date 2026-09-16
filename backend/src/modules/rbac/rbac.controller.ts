import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Audit } from '../../common/decorators/audit.decorator';

@ApiTags('rbac')
@ApiBearerAuth()
@Controller()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('roles')
  @RequirePermissions('role.view')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Get('permissions')
  @RequirePermissions('role.view')
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  @Post('roles')
  @RequirePermissions('role.manage')
  @Audit({ action: 'ROLE.CREATE', referenceType: 'Role' })
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto.code, dto.name, dto.description);
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('role.manage')
  @Audit({ action: 'ROLE.PERMISSIONS.UPDATE', referenceType: 'Role' })
  setRolePermissions(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetRolePermissionsDto) {
    return this.rbacService.setRolePermissions(id, dto.permissionCodes);
  }
}
