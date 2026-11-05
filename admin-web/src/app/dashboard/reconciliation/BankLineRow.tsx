'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { BankTransaction, MatchCandidate } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { getMatchCandidatesAction, manualMatchAction, unmatchAction } from '@/lib/actions/reconciliation';

export function BankLineRow({ line, canManage }: { line: BankTransaction; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null);

  function findCandidates() {
    setError(null);
    setOpen(true);
    startTransition(async () => {
      const res = await getMatchCandidatesAction(line.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCandidates(res.candidates);
    });
  }

  function pick(financialTransactionId: string) {
    setError(null);
    startTransition(async () => {
      const res = await manualMatchAction(line.id, financialTransactionId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function unmatch() {
    setError(null);
    startTransition(async () => {
      const res = await unmatchAction(line.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <tr>
      <td className="px-5 py-3.5 font-medium text-ink">{line.bankRef}</td>
      <td className="px-5 py-3.5 text-ink-light">₹{line.amount}</td>
      <td className="px-5 py-3.5 text-ink-light">{formatDate(line.valueDate)}</td>
      <td className="px-5 py-3.5 text-ink-light">{line.description ?? '—'}</td>
      <td className="px-5 py-3.5 text-ink-light">
        {line.match ? (
          <>
            <span className="badge bg-emerald-50 text-emerald-700">{line.match.matchType}</span>
            {line.match.financialTransaction && (
              <p className="mt-1 text-xs text-ink-light/70">
                {line.match.financialTransaction.type} · {line.match.financialTransaction.loanNumber ?? '—'}
              </p>
            )}
          </>
        ) : (
          <span className="text-xs text-ink-light/60">Unmatched</span>
        )}
      </td>
      {canManage && (
        <td className="px-5 py-3.5 text-right">
          {line.isMatched ? (
            <button onClick={unmatch} disabled={pending} className="btn-secondary text-xs">
              {pending ? '…' : 'Unmatch'}
            </button>
          ) : !open ? (
            <button onClick={findCandidates} disabled={pending} className="btn-secondary text-xs">
              Find matches
            </button>
          ) : (
            <div className="flex flex-col items-end gap-1">
              {candidates === null && <p className="text-xs text-ink-light/60">Looking…</p>}
              {candidates?.length === 0 && <p className="text-xs text-ink-light/60">No candidates within ±3 days at this amount.</p>}
              {candidates?.map((c) => (
                <button key={c.id} onClick={() => pick(c.id)} disabled={pending} className="btn-secondary w-full text-left text-xs">
                  {c.type} · {c.loanNumber ?? '—'} · ₹{c.amount}
                </button>
              ))}
            </div>
          )}
          {error && <p className="mt-1 max-w-xs text-right text-xs text-rose-600">{error}</p>}
        </td>
      )}
    </tr>
  );
}
