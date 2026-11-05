'use client';

import { useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import { runSweepAction } from '@/lib/actions/collections';

export function RunSweepButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        className="btn-secondary text-xs"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await runSweepAction();
            setMessage(r.error ? { text: r.error, isError: true } : { text: r.summary ?? 'Done.', isError: false });
          })
        }
      >
        <RefreshCw size={13} className={pending ? 'animate-spin' : ''} /> {pending ? 'Running…' : 'Run overdue sweep'}
      </button>
      {message && <p className={`max-w-xs text-right text-xs ${message.isError ? 'text-rose-600' : 'text-ink-light'}`}>{message.text}</p>}
    </div>
  );
}
