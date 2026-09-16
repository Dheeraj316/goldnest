import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// Declarative, resource.action style permission requirement, e.g.
// @RequirePermissions('loan.approve'). Enforced by PermissionsGuard against
// the caller's role -> permissions, never against role name alone, so that
// permission grants stay data-driven and admin-configurable (spec #32, #54).
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
