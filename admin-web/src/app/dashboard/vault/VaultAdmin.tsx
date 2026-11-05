'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Warehouse } from 'lucide-react';
import { addVaultLocationAction, createVaultAction } from '@/lib/actions/vault';
import type { Vault, VaultLocationNode } from '@/lib/types';

function useStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: true; id?: string } | { ok: false; error: string }>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  };
  return { pending, error, run };
}

function LocationTree({ nodes, depth = 0 }: { nodes: VaultLocationNode[]; depth?: number }) {
  if (nodes.length === 0) return null;
  return (
    <ul className={depth > 0 ? 'ml-5 border-l border-gold-100 pl-3' : ''}>
      {nodes.map((n) => (
        <li key={n.id} className="py-0.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-light/70">{n.type}</span>{' '}
          <span className="text-sm font-medium text-ink">{n.code}</span>
          <LocationTree nodes={n.children} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

function AddLocationForm({ vaultId, locations }: { vaultId: string; locations: VaultLocationNode[] }) {
  const { pending, error, run } = useStep();
  const [type, setType] = useState('LOCKER');
  const [code, setCode] = useState('');
  const [parentId, setParentId] = useState('');
  const flat: { id: string; label: string }[] = [];
  const walk = (nodes: VaultLocationNode[], prefix: string) => nodes.forEach((n) => { flat.push({ id: n.id, label: `${prefix}${n.type} ${n.code}` }); walk(n.children, prefix + '— '); });
  walk(locations, '');

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!code.trim()) return;
        run(() => addVaultLocationAction(vaultId, type, code, parentId || undefined), () => setCode(''));
      }}
      className="mt-2 grid grid-cols-[auto_1fr_1fr_auto] items-end gap-2"
    >
      <div>
        <label className="label">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input">
          <option value="LOCKER">Locker</option>
          <option value="SHELF">Shelf</option>
          <option value="BIN">Bin</option>
        </select>
      </div>
      <div>
        <label className="label">Code</label>
        <input value={code} maxLength={40} onChange={(e) => setCode(e.target.value)} placeholder="L-03" className="input" />
      </div>
      <div>
        <label className="label">Inside (optional)</label>
        <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
          <option value="">— top level —</option>
          {flat.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending || !code.trim()} className="btn-secondary whitespace-nowrap">
        {pending ? 'Adding…' : 'Add'}
      </button>
      {error && (
        <p role="alert" className="col-span-4 text-xs text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}

function NewVaultForm() {
  const { pending, error, run } = useStep();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-xs">
        <Plus size={13} /> New vault
      </button>
    );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        run(() => createVaultAction(name), () => setOpen(false));
      }}
      className="flex items-end gap-2"
    >
      <div>
        <label className="label">Vault name</label>
        <input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="Branch Safe" className="input" autoFocus />
      </div>
      <button type="submit" disabled={pending || !name.trim()} className="btn-primary whitespace-nowrap">
        {pending ? 'Creating…' : 'Create'}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
        Cancel
      </button>
      {error && (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}

export function VaultAdmin({ vaults, canManage }: { vaults: Vault[]; canManage: boolean }): ReactNode {
  return (
    <section aria-label="Vaults" className="card mb-6 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Warehouse size={18} className="text-gold-600" />
          <h2 className="font-display text-lg font-semibold text-ink">Vaults & storage locations</h2>
        </div>
        {canManage && <NewVaultForm />}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {vaults.map((v) => (
          <div key={v.id} className="rounded-lg border border-gold-100 p-4">
            <p className="font-medium text-ink">{v.name}</p>
            <div className="mt-2">
              <LocationTree nodes={v.locations} />
              {v.locations.length === 0 && <p className="text-sm text-ink-light/60">No lockers, shelves or bins yet.</p>}
            </div>
            {canManage && <AddLocationForm vaultId={v.id} locations={v.locations} />}
          </div>
        ))}
        {vaults.length === 0 && <p className="text-sm text-ink-light/60">No vault set up for this branch yet.</p>}
      </div>
    </section>
  );
}
