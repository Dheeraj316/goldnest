'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function logActivityAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const caseId = String(formData.get('caseId'));
  try {
    await apiFetch(`/collections/cases/${caseId}/activities`, {
      method: 'POST',
      body: JSON.stringify({
        type: String(formData.get('type')),
        outcome: String(formData.get('outcome') || '') || undefined,
        notes: String(formData.get('notes') || '').trim() || undefined,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not log the activity.' };
  }
  revalidatePath(`/dashboard/collections/${caseId}`);
  revalidatePath('/dashboard/collections');
  return { success: true };
}

export async function createPromiseAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const caseId = String(formData.get('caseId'));
  try {
    await apiFetch(`/collections/cases/${caseId}/promises`, {
      method: 'POST',
      body: JSON.stringify({
        promisedAmount: Number(formData.get('promisedAmount')),
        promisedDate: String(formData.get('promisedDate')),
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not record the promise.' };
  }
  revalidatePath(`/dashboard/collections/${caseId}`);
  revalidatePath('/dashboard/collections');
  return { success: true };
}

export async function assignCaseAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const caseId = String(formData.get('caseId'));
  try {
    await apiFetch(`/collections/cases/${caseId}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ employeeId: String(formData.get('employeeId')) }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not assign the case.' };
  }
  revalidatePath(`/dashboard/collections/${caseId}`);
  revalidatePath('/dashboard/collections');
  return { success: true };
}

export async function runSweepAction(): Promise<{ error?: string; summary?: string }> {
  try {
    const r = await apiFetch<{ markedOverdue: number; casesOpened: number; casesClosed: number; promisesKept: number; promisesBroken: number; errors: number }>(
      '/collections/sweep',
      { method: 'POST' },
    );
    revalidatePath('/dashboard/collections');
    return {
      summary: `${r.markedOverdue} loan(s) marked overdue, ${r.casesOpened} case(s) opened, ${r.casesClosed} closed, ${r.promisesKept} promise(s) kept, ${r.promisesBroken} broken${r.errors ? `, ${r.errors} error(s)` : ''}.`,
    };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'The sweep failed.' };
  }
}
