'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, RefreshCw } from 'lucide-react';
import { autoMatchAction, importBankTransactionAction } from '@/lib/actions/reconciliation';

export function ImportLineForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bankRef, setBankRef] = useState('');
  const [amount, setAmount] = useState('');
  const [valueDate, setValueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await importBankTransactionAction(bankRef, Number(amount), valueDate, description);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBankRef('');
      setAmount('');
      setDescription('');
      setOpen(false);
      router.refresh();
    });
  }

  function scan() {
    setError(null);
    startTransition(async () => {
      const res = await autoMatchAction();
      if (!res.ok) setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button onClick={scan} disabled={pending} className="btn-secondary whitespace-nowrap text-xs">
          <RefreshCw size={13} className={pending ? 'animate-spin' : ''} /> Run auto-match
        </button>
        <button onClick={() => setOpen((v) => !v)} className="btn-primary whitespace-nowrap text-xs">
          <Upload size={13} /> Add bank line
        </button>
      </div>
      {open && (
        <div className="flex flex-wrap items-end justify-end gap-2 rounded-lg border border-navy-900/15 bg-white p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-light">Bank ref</label>
            <input value={bankRef} onChange={(e) => setBankRef(e.target.value)} className="w-36 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-light">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-28 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-light">Value date</label>
            <input type="date" value={valueDate} onChange={(e) => setValueDate(e.target.value)} className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-light">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-44 rounded-lg border border-navy-900/15 px-2 py-1.5 text-sm" />
          </div>
          <button disabled={pending || !bankRef || !amount} onClick={submit} className="btn-primary text-xs">
            {pending ? 'Adding…' : 'Add'}
          </button>
        </div>
      )}
      {error && <p className="max-w-sm text-right text-xs text-rose-600">{error}</p>}
    </div>
  );
}
