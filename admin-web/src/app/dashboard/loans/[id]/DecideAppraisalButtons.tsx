'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideAppraisalAction } from '@/lib/actions/loans';

export function DecideAppraisalButtons({ loanId, appraisalId }: { loanId: string; appraisalId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const decide = (decision: 'APPROVED' | 'REJECTED') => {
    setError(null);
    startTransition(async () => {
      const result = await decideAppraisalAction(loanId, appraisalId, decision);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="mt-3">
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={pending} onClick={() => decide('APPROVED')}>
          Approve appraisal
        </button>
        <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => decide('REJECTED')}>
          Reject
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
