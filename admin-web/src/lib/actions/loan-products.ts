'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createLoanProductAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch('/loan-products', {
      method: 'POST',
      body: JSON.stringify({
        code: String(formData.get('code')).toUpperCase().trim(),
        name: String(formData.get('name')).trim(),
        type: 'GOLD_LOAN',
        maxLtvPercent: Number(formData.get('maxLtvPercent')),
        minLoanAmount: Number(formData.get('minLoanAmount')),
        maxLoanAmount: Number(formData.get('maxLoanAmount')),
        minTenureDays: Number(formData.get('minTenureDays')),
        maxTenureDays: Number(formData.get('maxTenureDays')),
        gracePeriodDays: Number(formData.get('gracePeriodDays') || 0),
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not create loan product.' };
  }
  revalidatePath('/dashboard/loan-products');
  return { success: true };
}

export async function addInterestRuleAction(productId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch(`/loan-products/${productId}/interest-rules`, {
      method: 'POST',
      body: JSON.stringify({
        method: String(formData.get('method')),
        annualRatePercent: Number(formData.get('annualRatePercent')),
        accrualFrequency: String(formData.get('accrualFrequency')),
        paymentFrequency: String(formData.get('paymentFrequency')),
        penalRatePercent: Number(formData.get('penalRatePercent') || 0),
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not add interest rule.' };
  }
  revalidatePath(`/dashboard/loan-products/${productId}`);
  return { success: true };
}

export async function addChargeAction(productId: string, _prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch(`/loan-products/${productId}/charges`, {
      method: 'POST',
      body: JSON.stringify({
        code: String(formData.get('code')).toUpperCase().trim(),
        name: String(formData.get('name')).trim(),
        calcType: String(formData.get('calcType')),
        amount: Number(formData.get('amount')),
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not add charge.' };
  }
  revalidatePath(`/dashboard/loan-products/${productId}`);
  return { success: true };
}
