'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Gavel } from 'lucide-react';
import { startAuctionAction } from '@/lib/actions/auctions';

// Puts an overdue loan forward as an auction candidate, then opens the auction so the next step can be taken.
// The API re-checks eligibility (days past due, gold, amount owing) and refuses with a clear reason if it fails.
export function StartAuctionButton({ loanId, loanNumber }: { loanId: string; loanNumber: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await startAuctionAction(loanId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.id ? `/dashboard/auctions/${res.id}` : '/dashboard/auctions');
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={start} disabled={pending} aria-label={`Start auction for ${loanNumber}`} className="btn-secondary whitespace-nowrap text-xs">
        <Gavel size={13} /> {pending ? 'Starting…' : 'Start auction'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
