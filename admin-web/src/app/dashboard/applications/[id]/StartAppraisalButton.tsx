'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { startAppraisalAction } from '@/lib/actions/loans';

export function StartAppraisalButton({ applicationId }: { applicationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await startAppraisalAction(applicationId);
            if (result.error) {
              setError(result.error);
            } else if (result.loanId) {
              router.push(`/dashboard/loans/${result.loanId}`);
            }
          })
        }
      >
        {pending ? 'Starting…' : 'Start appraisal'}
      </button>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
