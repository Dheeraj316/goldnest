'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch, ApiError } from '../api-server';

export type VaultActionResult = { ok: true; id?: string } | { ok: false; error: string };

async function run(path: string, body?: unknown, fallback = 'That did not work. Please try again.'): Promise<VaultActionResult> {
  try {
    const res = await apiFetch<{ id?: string }>(path, { method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    revalidatePath('/dashboard/vault', 'layout');
    return { ok: true, id: res?.id };
  } catch (e) {
    return { ok: false, error: e instanceof ApiError ? e.message : fallback };
  }
}

export async function createVaultAction(name: string): Promise<VaultActionResult> {
  return run('/vault/vaults', { name: name.trim() }, 'Could not create the vault.');
}
export async function addVaultLocationAction(vaultId: string, type: string, code: string, parentId?: string): Promise<VaultActionResult> {
  return run(`/vault/vaults/${vaultId}/locations`, { type, code: code.trim(), parentId: parentId || undefined }, 'Could not add the location.');
}
export async function sealPacketAction(collateralId: string): Promise<VaultActionResult> {
  return run('/vault/packets', { collateralId }, 'Could not seal a packet for this collateral.');
}
export async function storePacketAction(id: string, vaultLocationId: string, reason?: string): Promise<VaultActionResult> {
  return run(`/vault/packets/${id}/store`, { vaultLocationId, reason: reason?.trim() || undefined }, 'Could not store the packet.');
}
export async function movePacketAction(id: string, vaultLocationId: string, reason: string): Promise<VaultActionResult> {
  return run(`/vault/packets/${id}/move`, { vaultLocationId, reason: reason.trim() }, 'Could not move the packet.');
}
export async function auditPacketAction(id: string, present: boolean, notes?: string): Promise<VaultActionResult> {
  return run(`/vault/packets/${id}/audit`, { present, notes: notes?.trim() || undefined }, 'Could not record the audit.');
}
export async function closeOutPacketAction(id: string, reason?: string): Promise<VaultActionResult> {
  return run(`/vault/packets/${id}/close-out`, { reason: reason?.trim() || undefined }, 'Could not close out the packet.');
}
