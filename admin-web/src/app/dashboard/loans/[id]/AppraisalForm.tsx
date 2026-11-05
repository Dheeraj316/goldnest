'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAppraisalAction } from '@/lib/actions/loans';
import type { CollateralItem } from '@/lib/types';

export function AppraisalForm({ loanId, collateralId, items }: { loanId: string; collateralId: string; items: CollateralItem[] }) {
  const [goldRate, setGoldRate] = useState('6500');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = () => {
    setError(null);
    const rate = Number(goldRate);
    if (!rate || rate <= 0) {
      setError('Enter a valid gold rate per gram.');
      return;
    }
    startTransition(async () => {
      const result = await createAppraisalAction(loanId, collateralId, rate, items.map((i) => ({ collateralItemId: i.id })));
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="rounded-lg border border-gold-100 p-4">
      <p className="text-sm font-medium text-ink">Appraise this collateral</p>
      <p className="mt-1 text-xs text-ink-light/70">
        Uses each item&apos;s recorded weight and purity. Valuation and eligible amount are calculated on the server.
      </p>
      <div className="mt-3">
        <label className="label">Gold rate (₹/gram, 24k)</label>
        <input type="number" min="1" step="1" className="input" value={goldRate} onChange={(e) => setGoldRate(e.target.value)} />
      </div>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      <button type="button" className="btn-primary mt-4 w-full" disabled={pending} onClick={submit}>
        {pending ? 'Submitting…' : 'Submit appraisal'}
      </button>
    </div>
  );
}
