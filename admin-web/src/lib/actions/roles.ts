'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';
import type { FormState } from './branches';

export async function createRoleAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch('/roles', {
      method: 'POST',
      body: JSON.stringify({
        code: String(formData.get('code')).toUpperCase().trim().replace(/\s+/g, '_'),
        name: String(formData.get('name')).trim(),
        description: String(formData.get('description') || '').trim() || undefined,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not create role.' };
  }
  revalidatePath('/dashboard/roles');
  return { success: true };
}

export interface RoleAccessChangeInput {
  roleId: string;
  grant: string[];
  revoke: string[];
}

export type SaveAccessResult = { ok: true; changed: number } | { ok: false; error: string };

// Switches permissions on/off for one or more roles in a single all-or-nothing call. The backend applies
// its own rules (Super Admin is locked, you cannot edit your own role or grant what you don't hold) and
// the change is live for the affected employees on their next request.
export async function saveRoleAccessAction(changes: RoleAccessChangeInput[]): Promise<SaveAccessResult> {
  const nonEmpty = changes.filter((c) => c.grant.length > 0 || c.revoke.length > 0);
  if (nonEmpty.length === 0) return { ok: true, changed: 0 };
  try {
    await apiFetch('/roles/access', { method: 'PATCH', body: JSON.stringify({ changes: nonEmpty }) });
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'Could not save the access changes. Please try again.' };
  }
  revalidatePath('/dashboard/roles', 'layout');
  return { ok: true, changed: nonEmpty.length };
}
