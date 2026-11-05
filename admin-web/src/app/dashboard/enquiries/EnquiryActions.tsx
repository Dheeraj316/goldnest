'use client';

import { useTransition } from 'react';
import { updateEnquiryStatusAction } from '@/lib/actions/enquiries';

export function EnquiryActions({ id, status }: { id: string; status: 'NEW' | 'CONTACTED' | 'CLOSED' }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(next: 'NEW' | 'CONTACTED' | 'CLOSED') {
    startTransition(() => updateEnquiryStatusAction(id, next));
  }

  return (
    <div className="flex gap-2">
      {status !== 'CONTACTED' && (
        <button
          disabled={isPending}
          onClick={() => setStatus('CONTACTED')}
          className="rounded-md border border-gold-200 px-2.5 py-1 text-xs font-medium text-ink hover:bg-gold-50 disabled:opacity-50"
        >
          Mark contacted
        </button>
      )}
      {status !== 'CLOSED' && (
        <button
          disabled={isPending}
          onClick={() => setStatus('CLOSED')}
          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-ink-light hover:bg-gray-50 disabled:opacity-50"
        >
          Close
        </button>
      )}
      {status === 'CLOSED' && (
        <button
          disabled={isPending}
          onClick={() => setStatus('NEW')}
          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-ink-light hover:bg-gray-50 disabled:opacity-50"
        >
          Reopen
        </button>
      )}
    </div>
  );
}
