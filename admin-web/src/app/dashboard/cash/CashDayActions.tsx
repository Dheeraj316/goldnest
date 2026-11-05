'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeCashRegisterAction, openCashRegisterAction, recordCashEntryAction } from '@/lib/actions/cash';

const ENTRY_TYPES = [
  { key: 'RECEIPT', label: 'Receipt' },
  { key: 'DISBURSEMENT', label: 'Disbursement' },
  { key: 'TRANSFER', label: 'Transfer' },
] as const;

export function CashDayActions({ branchId, isOpen, isClosed, expectedBalance }: { branchId: string; isOpen: boolean; isClosed: boolean; expectedBalance: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [entryType, setEntryType] = useState<(typeof ENTRY_TYPES)[number]['key']>('RECEIPT');
  const [counted, setCounted] = useState(expectedBalance);

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setAmount('');
      setReference('');
      router.refresh();
    });
  }

  if (isClosed) {
    return <p className="text-xs text-ink-light/70">Nothing more to do — today is closed.</p>;
  }

  if (!isOpen) {
    return (
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-light">Opening float</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-32 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
        </div>
        <button disabled={pending || !amount} onClick={() => run(() => openCashRegisterAction(Number(amount), branchId))} className="btn-primary text-xs">
          {pending ? 'Opening…' : 'Open register'}
        </button>
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-end gap-2">
        <select value={entryType} onChange={(e) => setEntryType(e.target.value as typeof entryType)} className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm">
          {ENTRY_TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
        <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
        <input type="text" placeholder="Reference" value={reference} onChange={(e) => setReference(e.target.value)} className="w-40 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
        <button disabled={pending || !amount} onClick={() => run(() => recordCashEntryAction(entryType, Number(amount), reference, branchId))} className="btn-secondary text-xs">
          {pending ? '…' : 'Record'}
        </button>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-light">Counted at close (expected ₹{expectedBalance})</label>
          <input type="number" value={counted} onChange={(e) => setCounted(e.target.value)} className="w-32 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
        </div>
        <button disabled={pending || !counted} onClick={() => run(() => closeCashRegisterAction(Number(counted), reference, branchId))} className="btn-primary text-xs">
          {pending ? 'Closing…' : 'Close register'}
        </button>
      </div>
      {error && <p className="max-w-xs text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}
