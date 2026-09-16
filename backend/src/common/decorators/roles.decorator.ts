import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Coarse-grained role gate. Prefer @RequirePermissions for anything sensitive;
// this exists for simple UX-level gating (e.g. "staff-only" endpoints).
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
