import 'server-only';
import { cache } from 'react';
import { getAccessToken } from './session';
import { apiFetch } from './api-server';
import { decodeJwtPayload } from './jwt';

export interface CurrentUser {
  userId: string;
  employeeId?: string;
  branchId?: string;
  roleCode?: string;
  permissions: string[];
}

// Identity comes off the (backend-signed) access token, but what the person may do is asked of the API each
// time: the token's permission list is only a snapshot from sign-in, and showing screens from it would keep
// offering access an admin has switched off (or hide access just granted) until the next sign-in. The API
// enforces every permission on every request regardless — this only keeps what is SHOWN accurate. If the
// lookup fails, the token's snapshot is used so pages still render.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload<CurrentUser>(token);
  if (!payload) return null;
  try {
    const me = await apiFetch<{ permissions?: string[]; role?: { code: string } }>('/employees/me');
    if (Array.isArray(me.permissions)) return { ...payload, permissions: me.permissions, roleCode: me.role?.code ?? payload.roleCode };
  } catch {
    // fall back to the snapshot
  }
  return payload;
});

export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}
