'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { closeLoanAction } from '@/lib/actions/loans';

export function CloseLoanButton({ loanId }: { loanId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <button
        type="button"
        className="btn-primary w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await closeLoanAction(loanId);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        {pending ? 'Closing…' : 'Close loan (fully settled)'}
      </button>
      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
