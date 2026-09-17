'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';
import type { FormState } from './branches';

export async function createEmployeeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch('/employees', {
      method: 'POST',
      body: JSON.stringify({
        firstName: String(formData.get('firstName')).trim(),
        lastName: String(formData.get('lastName') || '').trim() || undefined,
        mobile: String(formData.get('mobile')).trim(),
        email: String(formData.get('email') || '').trim() || undefined,
        branchId: String(formData.get('branchId')),
        roleId: String(formData.get('roleId')),
        initialPassword: String(formData.get('initialPassword')),
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not create employee.' };
  }

  revalidatePath('/dashboard/employees');
  return { success: true };
}

export async function activateEmployeeAction(id: string): Promise<void> {
  await apiFetch(`/employees/${id}/activate`, { method: 'PATCH' });
  revalidatePath('/dashboard/employees');
}

export async function deactivateEmployeeAction(id: string): Promise<void> {
  await apiFetch(`/employees/${id}/deactivate`, { method: 'PATCH' });
  revalidatePath('/dashboard/employees');
}

export async function resetEmployeeAccessAction(id: string): Promise<{ temporaryPassword?: string }> {
  const result = await apiFetch<{ temporaryPassword?: string }>(`/employees/${id}/reset-access`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  revalidatePath('/dashboard/employees');
  return result;
}
