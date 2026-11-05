'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch, ApiError } from '../api-server';

export interface FormState {
  error?: string;
  success?: boolean;
}

export async function createApplicationAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiFetch('/loan-applications', {
      method: 'POST',
      body: JSON.stringify({
        customerId: String(formData.get('customerId')),
        productId: String(formData.get('productId')),
        branchId: String(formData.get('branchId')),
        requestedAmount: Number(formData.get('requestedAmount')),
        requestedTenureDays: Number(formData.get('requestedTenureDays')),
        purpose: String(formData.get('purpose') || '').trim() || undefined,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not create application.' };
  }
  revalidatePath('/dashboard/applications');
  return { success: true };
}

export async function startAppraisalAction(applicationId: string): Promise<{ error?: string; loanId?: string }> {
  try {
    const loan = await apiFetch<{ id: string }>(`/loan-applications/${applicationId}/start-appraisal`, { method: 'POST' });
    revalidatePath('/dashboard/applications');
    revalidatePath('/dashboard/loans');
    return { loanId: loan.id };
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not start appraisal.' };
  }
}

export async function createCollateralAction(
  loanId: string,
  items: { itemType: string; grossWeight: number; stoneWeight: number; netWeight: number; purityKarat: number }[],
): Promise<FormState> {
  try {
    await apiFetch(`/loans/${loanId}/collateral`, { method: 'POST', body: JSON.stringify({ items }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not record collateral.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function createAppraisalAction(
  loanId: string,
  collateralId: string,
  goldRatePerGram: number,
  items: { collateralItemId: string }[],
): Promise<FormState> {
  try {
    await apiFetch(`/loans/collateral/${collateralId}/appraisals`, {
      method: 'POST',
      body: JSON.stringify({ goldRatePerGram, items }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not record appraisal.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function decideAppraisalAction(loanId: string, appraisalId: string, decision: 'APPROVED' | 'REJECTED'): Promise<FormState> {
  try {
    await apiFetch(`/loans/appraisals/${appraisalId}/decide`, { method: 'POST', body: JSON.stringify({ decision }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not decide appraisal.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function decideLoanApprovalAction(loanId: string, decision: 'APPROVED' | 'REJECTED' | 'REFERRED'): Promise<FormState> {
  try {
    await apiFetch(`/loans/${loanId}/approve`, { method: 'POST', body: JSON.stringify({ decision }) });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not decide loan approval.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function disburseLoanAction(loanId: string): Promise<FormState> {
  try {
    await apiFetch(`/loans/${loanId}/disburse`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not disburse loan.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function recordPaymentAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const loanId = String(formData.get('loanId'));
  try {
    await apiFetch(`/loans/${loanId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount: Number(formData.get('amount')), mode: String(formData.get('mode')) }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not record payment.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

// Redirects to the NEW loan on success: the old loan flips to RENEWED, which
// unmounts the calling form, so a client-side navigation would never run.
export async function renewLoanAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const loanId = String(formData.get('loanId'));
  let newLoanId: string;
  try {
    const tenure = String(formData.get('newTenureDays') || '').trim();
    const result = await apiFetch<{ newLoan: { id: string } }>(`/loans/${loanId}/renew`, {
      method: 'POST',
      body: JSON.stringify({
        paymentAmount: Number(formData.get('paymentAmount')),
        paymentMode: String(formData.get('paymentMode')),
        newTenureDays: tenure ? Number(tenure) : undefined,
        remarks: String(formData.get('remarks') || '').trim() || undefined,
      }),
    });
    newLoanId = result.newLoan.id;
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not renew loan.' };
  }
  revalidatePath('/dashboard/loans');
  revalidatePath(`/dashboard/loans/${loanId}`);
  redirect(`/dashboard/loans/${newLoanId}`);
}

export async function topUpLoanAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const loanId = String(formData.get('loanId'));
  try {
    const requested = String(formData.get('requestedAmount') || '').trim();
    await apiFetch(`/loans/${loanId}/topup`, {
      method: 'POST',
      body: JSON.stringify({
        goldRatePerGram: Number(formData.get('goldRatePerGram')),
        requestedAmount: requested ? Number(requested) : undefined,
        remarks: String(formData.get('remarks') || '').trim() || undefined,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not top up loan.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function partReleaseAction(_prevState: FormState, formData: FormData): Promise<FormState> {
  const loanId = String(formData.get('loanId'));
  try {
    await apiFetch(`/loans/${loanId}/part-release`, {
      method: 'POST',
      body: JSON.stringify({
        itemIds: formData.getAll('itemIds').map(String),
        goldRatePerGram: Number(formData.get('goldRatePerGram')),
        remarks: String(formData.get('remarks') || '').trim() || undefined,
      }),
    });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not release gold.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}

export async function closeLoanAction(loanId: string): Promise<FormState> {
  try {
    await apiFetch(`/loans/${loanId}/close`, { method: 'POST' });
  } catch (e) {
    return { error: e instanceof ApiError ? e.message : 'Could not close loan.' };
  }
  revalidatePath(`/dashboard/loans/${loanId}`);
  return { success: true };
}
