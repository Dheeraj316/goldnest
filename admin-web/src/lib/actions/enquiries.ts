'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '../api-server';

export async function updateEnquiryStatusAction(id: string, status: 'NEW' | 'CONTACTED' | 'CLOSED'): Promise<void> {
  await apiFetch(`/enquiries/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  revalidatePath('/dashboard/enquiries');
}
