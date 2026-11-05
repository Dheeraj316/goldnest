import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/utils/error-codes';
import { JwtPayloadUser } from '../../common/interfaces/authenticated-request.interface';
import { AccessRuleError, diffToChange, planAccessChange } from './access-rules';

export interface RoleAccessChange {
  roleId: string;
  grant?: string[];
  revoke?: string[];
}

export interface RoleAccessResult {
  roleId: string;
  roleCode: string;
  roleName: string;
  granted: string[];
  revoked: string[];
}

// How long an employee's live access is remembered between requests. Every request re-reads the caller's
// current role and permissions, so an admin's change applies on the very next request (this process clears
// the cache the moment access, a role assignment or an account status changes); the short TTL only bounds how
// stale a second API instance could be. Move to a shared cache when running more than one instance.
const LIVE_ACCESS_TTL_MS = 5_000;
const LIVE_ACCESS_MAX_ENTRIES = 2_000;

export interface LiveAccess {
  roleCode: string;
  permissions: string[];
}

@Injectable()
export class RbacService {
  private readonly liveCache = new Map<string, { access: LiveAccess | null; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async getPermissionCodesForRole(roleId: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rolePermissions.map((rp) => rp.permission.code);
  }

  /**
   * What this employee may do RIGHT NOW. Access tokens carry a snapshot taken at sign-in, so without this an
   * admin who switches something off (or changes someone's role, or deactivates them) would have to wait for
   * the token to expire. Returns null when the employee no longer exists or is not active — such a token must
   * stop working. A role that is not active grants nothing.
   */
  async getLiveAccess(employeeId: string): Promise<LiveAccess | null> {
    const hit = this.liveCache.get(employeeId);
    if (hit && hit.expiresAt > Date.now()) return hit.access;

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        status: true,
        deletedAt: true,
        user: { select: { status: true } },
        role: { select: { code: true, status: true, permissions: { select: { permission: { select: { code: true } } } } } },
      },
    });
    const usable = !!employee && !employee.deletedAt && employee.status === 'ACTIVE' && employee.user.status === 'ACTIVE';
    const access: LiveAccess | null = usable
      ? { roleCode: employee.role.code, permissions: employee.role.status === 'ACTIVE' ? employee.role.permissions.map((rp) => rp.permission.code) : [] }
      : null;

    if (this.liveCache.size >= LIVE_ACCESS_MAX_ENTRIES) this.liveCache.clear();
    this.liveCache.set(employeeId, { access, expiresAt: Date.now() + LIVE_ACCESS_TTL_MS });
    return access;
  }

  /** Forget everything remembered about live access, so the next request of every user re-reads it. */
  invalidateLiveAccess(): void {
    this.liveCache.clear();
  }

  async listRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { employees: true } },
      },
    });
  }

  async listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  async createRole(code: string, name: string, description?: string) {
    // A new role starts with no access at all — an admin decides what it can do.
    return this.prisma.role.create({ data: { code, name, description } });
  }

  /** Replaces a role's permissions with exactly this set (expressed as the equivalent grant/revoke change). */
  async setRolePermissions(actor: JwtPayloadUser, roleId: string, permissionCodes: string[], ctx: RequestContext = {}) {
    const current = new Set(await this.getPermissionCodesForRole(roleId));
    const { grant, revoke } = diffToChange(current, permissionCodes);
    await this.applyAccessChanges(actor, [{ roleId, grant, revoke }], ctx);
    return this.listRoles();
  }

  /**
   * Grants and revokes permissions on one or more roles, all or nothing. Working in deltas (rather than
   * "here is the full list") means two admins editing at once cannot silently undo each other, and every
   * change is recorded in the audit log with exactly what was switched on and off.
   */
  async applyAccessChanges(actor: JwtPayloadUser, changes: RoleAccessChange[], ctx: RequestContext = {}): Promise<RoleAccessResult[]> {
    const ids = changes.map((c) => c.roleId);
    if (new Set(ids).size !== ids.length) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, HttpStatus.BAD_REQUEST, 'Each role can appear only once in a change.');
    }

    const results = await this.prisma.$transaction(async (tx) => {
      // `actor.permissions` is already the caller's live access (see JwtStrategy), not the sign-in snapshot.
      const actorCodes = actor.permissions ?? [];
      const [roles, permissions] = await Promise.all([
        tx.role.findMany({ where: { id: { in: ids } }, include: { permissions: { select: { permissionId: true } } } }),
        tx.permission.findMany({ select: { id: true, code: true } }),
      ]);
      const knownCodes = new Set(permissions.map((p) => p.code));
      const idByCode = new Map(permissions.map((p) => [p.code, p.id]));
      const codeById = new Map(permissions.map((p) => [p.id, p.code]));

      const out: RoleAccessResult[] = [];
      for (const change of changes) {
        const role = roles.find((r) => r.id === change.roleId);
        if (!role) throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, HttpStatus.NOT_FOUND, 'Role not found.');

        const before = role.permissions.map((rp) => codeById.get(rp.permissionId)).filter((c): c is string => !!c);
        let plan;
        try {
          plan = planAccessChange({
            roleCode: role.code,
            roleName: role.name,
            currentCodes: new Set(before),
            grant: change.grant ?? [],
            revoke: change.revoke ?? [],
            knownCodes,
            actorRoleCode: actor.roleCode,
            actorCodes: new Set(actorCodes),
          });
        } catch (e) {
          if (e instanceof AccessRuleError) {
            const status = e.rule === 'UNKNOWN_PERMISSION' || e.rule === 'CONFLICT' ? HttpStatus.BAD_REQUEST : HttpStatus.FORBIDDEN;
            throw new AppException(status === HttpStatus.BAD_REQUEST ? ErrorCode.VALIDATION_FAILED : ErrorCode.UNAUTHORIZED, status, e.message);
          }
          throw e;
        }

        if (plan.revoked.length > 0) {
          await tx.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: { in: plan.revoked.map((c) => idByCode.get(c) as string) } } });
        }
        if (plan.granted.length > 0) {
          await tx.rolePermission.createMany({
            data: plan.granted.map((c) => ({ roleId: role.id, permissionId: idByCode.get(c) as string })),
            skipDuplicates: true,
          });
        }
        const after = before.filter((c) => !plan.revoked.includes(c)).concat(plan.granted);

        // The audit entry is written in the same transaction as the change itself: an access change can never
        // be saved without its record, nor recorded without having been saved.
        if (plan.granted.length > 0 || plan.revoked.length > 0) {
          await tx.auditLog.create({
            data: {
              userId: actor.userId,
              employeeId: actor.employeeId,
              action: 'ROLE.ACCESS.UPDATE',
              referenceType: 'Role',
              referenceId: role.id,
              beforeValue: { role: role.code, permissions: [...before].sort() },
              afterValue: { role: role.code, permissions: [...after].sort(), granted: plan.granted, revoked: plan.revoked },
              ip: ctx.ip,
              device: ctx.device,
            },
          });
        }
        out.push({ roleId: role.id, roleCode: role.code, roleName: role.name, granted: plan.granted, revoked: plan.revoked });
      }
      return out;
    });

    // Committed: make it apply to the very next request of everyone affected.
    this.invalidateLiveAccess();
    return results;
  }
}

export interface RequestContext {
  ip?: string;
  device?: string;
}
