import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request.interface';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../utils/error-codes';

// Global authorization guard. A route with no @RequirePermissions/@Roles is
// allowed through once authenticated — deliberately permissive by default so
// this guard never silently blocks a route nobody thought to annotate;
// sensitive routes MUST declare their required permission explicitly (spec #54).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if ((!requiredPermissions || requiredPermissions.length === 0) && (!requiredRoles || requiredRoles.length === 0)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new AppException(ErrorCode.UNAUTHENTICATED, HttpStatus.UNAUTHORIZED);
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!user.roleCode || !requiredRoles.includes(user.roleCode)) {
        throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
      }
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const granted = new Set(user.permissions || []);
      const hasAll = requiredPermissions.every((p) => granted.has(p));
      if (!hasAll) {
        throw new AppException(ErrorCode.UNAUTHORIZED, HttpStatus.FORBIDDEN);
      }
    }

    return true;
  }
}
