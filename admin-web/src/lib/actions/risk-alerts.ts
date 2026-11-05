'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export type RiskAlertActionResult = { ok: true } | { ok: false; error: string };

async function run(path: string, body?: unknown, fallback = 'That did not work. Please try again.'): Promise<RiskAlertActionResult> {
  try {
    await apiFetch(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    revalidatePath('/dashboard/risk-alerts', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : fallback };
  }
}

export async function reviewAlertAction(id: string, decision: 'REVIEWED' | 'DISMISSED' | 'ESCALATED', note?: string): Promise<RiskAlertActionResult> {
  return run(`/risk-alerts/${id}/review`, { decision, note: note?.trim() || undefined }, 'Could not update this alert.');
}

export async function scanAction(): Promise<RiskAlertActionResult> {
  return run('/risk-alerts/scan', undefined, 'Could not run the risk scan.');
}
