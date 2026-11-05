'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { decideLoanApprovalAction } from '@/lib/actions/loans';

export function ApprovalActions({ loanId }: { loanId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const decide = (decision: 'APPROVED' | 'REJECTED' | 'REFERRED') => {
    setError(null);
    startTransition(async () => {
      const result = await decideLoanApprovalAction(loanId, decision);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="pt-2">
      <div className="flex gap-2">
        <button type="button" className="btn-primary flex-1" disabled={pending} onClick={() => decide('APPROVED')}>
          Approve loan
        </button>
        <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => decide('REJECTED')}>
          Reject
        </button>
        <button type="button" className="btn-secondary flex-1" disabled={pending} onClick={() => decide('REFERRED')}>
          Refer up
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
