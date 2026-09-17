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

export async function setRolePermissionsAction(roleId: string, permissionCodes: string[]): Promise<void> {
  await apiFetch(`/roles/${roleId}/permissions`, {
    method: 'PUT',
    body: JSON.stringify({ permissionCodes }),
  });
  revalidatePath(`/dashboard/roles/${roleId}`);
  revalidatePath('/dashboard/roles');
}
