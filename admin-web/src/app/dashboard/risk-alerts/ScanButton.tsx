'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { scanAction } from '@/lib/actions/risk-alerts';

// Runs the rule sweep on demand, the same idempotent scan the nightly scheduler runs at 1am IST —
// useful right after seeding data or when someone wants a fresh read without waiting for the scheduler.
export function ScanButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function scan() {
    setError(null);
    startTransition(async () => {
      const res = await scanAction();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={scan} disabled={pending} className="btn-secondary whitespace-nowrap text-xs">
        <RefreshCw size={13} className={pending ? 'animate-spin' : ''} /> {pending ? 'Scanning…' : 'Run risk scan now'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
