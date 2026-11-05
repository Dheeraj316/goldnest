'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';
import type { MatchCandidate } from '../types';

export type ReconciliationActionResult = { ok: true } | { ok: false; error: string };

async function run(path: string, body: unknown, fallback = 'That did not work. Please try again.'): Promise<ReconciliationActionResult> {
  try {
    await apiFetch(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    revalidatePath('/dashboard/reconciliation', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : fallback };
  }
}

export async function importBankTransactionAction(bankRef: string, amount: number, valueDate: string, description?: string): Promise<ReconciliationActionResult> {
  return run('/reconciliation/bank-transactions/import', { transactions: [{ bankRef: bankRef.trim(), amount, valueDate, description: description?.trim() || undefined }] }, 'Could not import that line.');
}
export async function autoMatchAction(): Promise<ReconciliationActionResult> {
  return run('/reconciliation/auto-match', undefined, 'Could not run auto-match.');
}
export async function manualMatchAction(id: string, financialTransactionId: string): Promise<ReconciliationActionResult> {
  return run(`/reconciliation/bank-transactions/${id}/match`, { financialTransactionId }, 'Could not match that line.');
}
export async function unmatchAction(id: string): Promise<ReconciliationActionResult> {
  return run(`/reconciliation/bank-transactions/${id}/unmatch`, undefined, 'Could not unmatch that line.');
}

export async function getMatchCandidatesAction(id: string): Promise<{ ok: true; candidates: MatchCandidate[] } | { ok: false; error: string }> {
  try {
    const candidates = await apiFetch<MatchCandidate[]>(`/reconciliation/bank-transactions/${id}/candidates`);
    return { ok: true, candidates };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'Could not load candidates.' };
  }
}
