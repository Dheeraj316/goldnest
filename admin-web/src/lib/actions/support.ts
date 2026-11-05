'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export type TicketActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function run(path: string, body?: unknown, fallback = 'That did not work. Please try again.'): Promise<TicketActionResult> {
  try {
    const res = await apiFetch<{ id?: string }>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    revalidatePath('/dashboard/support', 'layout');
    return { ok: true, id: res?.id };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : fallback };
  }
}

export async function createTicketAction(customerId: string, category: string, description: string, priority?: string, loanId?: string): Promise<TicketActionResult> {
  return run('/support-tickets', { customerId, category, description: description.trim(), priority, loanId: loanId || undefined }, 'Could not raise the ticket.');
}

// Staff know the customer by mobile number, not by id, so this resolves it first (branch-scoped, same as the
// customer search screen) and only then raises the ticket.
export async function createTicketByMobileAction(mobile: string, category: string, description: string, priority?: string): Promise<TicketActionResult> {
  try {
    const found = await apiFetch<{ items: { id: string }[] }>(`/customers?mobile=${encodeURIComponent(mobile.trim())}&pageSize=5`);
    if (found.items.length === 0) return { ok: false, error: `No customer found with mobile number ${mobile.trim()}.` };
    return await createTicketAction(found.items[0].id, category, description, priority);
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : 'Could not raise the ticket.' };
  }
}
export async function assignTicketAction(id: string, employeeId: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/assign`, { employeeId }, 'Could not assign the ticket.');
}
export async function startTicketAction(id: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/start`, undefined, 'Could not start work on the ticket.');
}
export async function waitForCustomerAction(id: string, note: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/waiting-for-customer`, { note: note.trim() || undefined }, 'Could not update the ticket.');
}
export async function resumeTicketAction(id: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/resume`, undefined, 'Could not resume the ticket.');
}
export async function resolveTicketAction(id: string, resolutionNote: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/resolve`, { resolutionNote: resolutionNote.trim() }, 'Could not resolve the ticket.');
}
export async function reopenTicketAction(id: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/reopen`, undefined, 'Could not reopen the ticket.');
}
export async function closeTicketAction(id: string): Promise<TicketActionResult> {
  return run(`/support-tickets/${id}/close`, undefined, 'Could not close the ticket.');
}
