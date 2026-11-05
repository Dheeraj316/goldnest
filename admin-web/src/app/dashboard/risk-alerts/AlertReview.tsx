'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { reviewAlertAction } from '@/lib/actions/risk-alerts';

const DECISIONS = [
  { key: 'REVIEWED', label: 'Mark reviewed', className: 'btn-secondary' },
  { key: 'ESCALATED', label: 'Escalate', className: 'btn-secondary' },
  { key: 'DISMISSED', label: 'Dismiss', className: 'btn-secondary' },
] as const;

export function AlertReview({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState(false);

  function decide(decision: (typeof DECISIONS)[number]['key']) {
    setError(null);
    startTransition(async () => {
      const res = await reviewAlertAction(id, decision, note);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary whitespace-nowrap text-xs">
        Review
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        rows={2}
        className="w-56 rounded-lg border border-navy-900/15 px-2 py-1 text-xs"
      />
      <div className="flex flex-wrap justify-end gap-1.5">
        {DECISIONS.map((d) => (
          <button key={d.key} onClick={() => decide(d.key)} disabled={pending} className={`${d.className} whitespace-nowrap text-xs`}>
            {pending ? '…' : d.label}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
