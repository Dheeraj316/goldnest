'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export type CashActionResult = { ok: true } | { ok: false; error: string };

async function run(path: string, body: unknown, fallback = 'That did not work. Please try again.'): Promise<CashActionResult> {
  try {
    await apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
    revalidatePath('/dashboard/cash', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : fallback };
  }
}

export async function openCashRegisterAction(amount: number, branchId?: string): Promise<CashActionResult> {
  return run('/cash-management/open', { amount, branchId }, 'Could not open the register.');
}
export async function recordCashEntryAction(type: 'RECEIPT' | 'DISBURSEMENT' | 'TRANSFER', amount: number, reference?: string, branchId?: string): Promise<CashActionResult> {
  return run('/cash-management/entries', { type, amount, reference: reference?.trim() || undefined, branchId }, 'Could not record the entry.');
}
export async function closeCashRegisterAction(amount: number, reference?: string, branchId?: string): Promise<CashActionResult> {
  return run('/cash-management/close', { amount, reference: reference?.trim() || undefined, branchId }, 'Could not close the register.');
}
