'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '../api-server';

export async function reviewKycAction(kycRecordId: string, customerId: string, decision: 'VERIFIED' | 'REJECTED', rejectionReason?: string): Promise<void> {
  await apiFetch(`/customers/kyc/${kycRecordId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ decision, rejectionReason }),
  });
  revalidatePath(`/dashboard/customers/${customerId}`);
}
