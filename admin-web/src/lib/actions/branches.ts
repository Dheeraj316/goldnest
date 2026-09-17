'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createBranchAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch('/branches', {
      method: 'POST',
      body: JSON.stringify({
        organizationId: String(formData.get('organizationId')),
        code: String(formData.get('code')).toUpperCase().trim(),
        name: String(formData.get('name')).trim(),
        addressLine1: String(formData.get('addressLine1')).trim(),
        city: String(formData.get('city')).trim(),
        state: String(formData.get('state')).trim(),
        pinCode: String(formData.get('pinCode')).trim(),
        phone: String(formData.get('phone') || '').trim() || undefined,
        email: String(formData.get('email') || '').trim() || undefined,
        cashLimit: String(formData.get('cashLimit') || '0'),
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not create branch.' };
  }

  revalidatePath('/dashboard/branches');
  return { success: true };
}

export async function deactivateBranchAction(id: string): Promise<void> {
  await apiFetch(`/branches/${id}/deactivate`, { method: 'PATCH' });
  revalidatePath('/dashboard/branches');
}
