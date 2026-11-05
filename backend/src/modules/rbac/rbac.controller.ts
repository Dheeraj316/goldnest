import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { UpdateRoleAccessDto, UpdateSingleRoleAccessDto } from './dto/update-role-access.dto';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/decorators/audit.decorator';
import { AuthenticatedRequest, JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';

const ctx = (req: AuthenticatedRequest) => ({ ip: req.ip, device: req.headers['user-agent'] as string | undefined });

// Changing what a role may do is itself gated by `role.manage`, and the service adds hard rules on top
// (see access-rules.ts): Super Admin is locked, nobody edits their own role, and nobody can grant access
// they do not hold. Every applied change is written to the audit log with what was switched on and off,
// and takes effect on the affected users' very next request.
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

  /** Switch access on/off for several roles at once (the access matrix). All or nothing. */
  @Patch('roles/access')
  @RequirePermissions('role.manage')
  updateAccess(@Body() dto: UpdateRoleAccessDto, @CurrentUser() user: JwtPayloadUser, @Req() req: AuthenticatedRequest) {
    return this.rbacService.applyAccessChanges(user, dto.changes, ctx(req));
  }

  /** Switch access on/off for one role. */
  @Patch('roles/:id/permissions')
  @RequirePermissions('role.manage')
  async updateRoleAccess(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSingleRoleAccessDto,
    @CurrentUser() user: JwtPayloadUser,
    @Req() req: AuthenticatedRequest,
  ) {
    const [result] = await this.rbacService.applyAccessChanges(user, [{ roleId: id, grant: dto.grant, revoke: dto.revoke }], ctx(req));
    return result;
  }

  /** Replace a role's permissions with exactly this set. Same rules and audit as the PATCH routes. */
  @Put('roles/:id/permissions')
  @RequirePermissions('role.manage')
  setRolePermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetRolePermissionsDto,
    @CurrentUser() user: JwtPayloadUser,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.rbacService.setRolePermissions(user, id, dto.permissionCodes, ctx(req));
  }
}
