'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export type AuctionActionResult = { ok: true; id?: string } | { ok: false; error: string };

// Each step of the auction workflow is one call to the API, which enforces the rules (who may do it, what
// state the auction must be in, the maker-checker split, the money maths). These only pass the request
// along and turn a refusal into a readable message.
async function run(path: string, body?: unknown, fallback = 'That did not work. Please try again.'): Promise<AuctionActionResult> {
  try {
    const res = await apiFetch<{ id?: string }>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    revalidatePath('/dashboard/auctions', 'layout');
    revalidatePath('/dashboard/loans', 'layout');
    return { ok: true, id: res?.id };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : fallback };
  }
}

export async function startAuctionAction(loanId: string): Promise<AuctionActionResult> {
  return run('/auctions', { loanId }, 'Could not start the auction.');
}
export async function prepareAuctionAction(id: string, goldRatePerGram: number): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/prepare`, { goldRatePerGram });
}
export async function sendAuctionNoticeAction(id: string, channels: string[]): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/notices`, { channels });
}
export async function approveAuctionAction(id: string): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/approve`);
}
export async function scheduleAuctionAction(id: string, scheduledDate: string, venue: string): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/schedule`, { scheduledDate, venue: venue.trim() || undefined });
}
export async function recordAuctionSaleAction(id: string, bids: { bidderName: string; bidAmount: number }[]): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/sale`, { bids });
}
export async function settleAuctionAction(id: string, mode: string, reference: string): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/settle`, { mode, reference: reference.trim() || undefined });
}
export async function writeOffAuctionShortfallAction(id: string, reason: string): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/write-off`, { reason });
}
export async function cancelAuctionAction(id: string, reason: string): Promise<AuctionActionResult> {
  return run(`/auctions/${id}/cancel`, { reason });
}
