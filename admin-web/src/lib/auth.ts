import 'server-only';
import { getAccessToken } from './session';
import { decodeJwtPayload } from './jwt';

export interface CurrentUser {
  userId: string;
  employeeId?: string;
  branchId?: string;
  roleCode?: string;
  permissions: string[];
}

// Reads identity/permissions straight off the (already backend-signed)
// access token for display and UI-gating purposes only — e.g. hiding a
// button the user has no permission for. The backend independently
// re-checks every permission on every request, so a stale or tampered
// client-side read here can never grant real access.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = decodeJwtPayload<CurrentUser>(token);
  if (!payload) return null;
  return payload;
}

export function hasPermission(user: CurrentUser | null, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}
