'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';
import type { FormState } from './branches';

export async function requestSettingChangeAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const dataType = String(formData.get('dataType'));
  const rawValue = String(formData.get('value'));
  let value: unknown = rawValue;
  if (dataType === 'NUMBER') value = Number(rawValue);
  else if (dataType === 'BOOLEAN') value = rawValue === 'true';
  else if (dataType === 'JSON') {
    try {
      value = JSON.parse(rawValue);
    } catch {
      return { error: 'Value must be valid JSON.' };
    }
  }

  try {
    await apiFetch('/settings/changes', {
      method: 'POST',
      body: JSON.stringify({
        key: String(formData.get('key')).trim().toUpperCase().replace(/\s+/g, '_'),
        dataType,
        value,
        description: String(formData.get('description') || '').trim() || undefined,
        changeReason: String(formData.get('changeReason') || '').trim() || undefined,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not submit the change request.' };
  }

  revalidatePath('/dashboard/settings');
  return { success: true };
}

export async function approveSettingChangeAction(versionId: string): Promise<{ error?: string }> {
  try {
    await apiFetch(`/settings/changes/${versionId}/approve`, { method: 'PATCH' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not approve this change.' };
  }
  revalidatePath('/dashboard/settings');
  return {};
}

export async function rejectSettingChangeAction(versionId: string, reason?: string): Promise<{ error?: string }> {
  try {
    await apiFetch(`/settings/changes/${versionId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not reject this change.' };
  }
  revalidatePath('/dashboard/settings');
  return {};
}
