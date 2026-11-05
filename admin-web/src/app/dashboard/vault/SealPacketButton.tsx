'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PackageCheck } from 'lucide-react';
import { sealPacketAction } from '@/lib/actions/vault';

// Seals the gold pledged against a loan into one tamper-evident packet. The server re-checks that the
// collateral is still pledged and doesn't already have an active packet before it lets this through.
export function SealPacketButton({ collateralId, collateralCode }: { collateralId: string; collateralCode: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function seal() {
    setError(null);
    startTransition(async () => {
      const res = await sealPacketAction(collateralId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(res.id ? `/dashboard/vault/${res.id}` : '/dashboard/vault');
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={seal} disabled={pending} aria-label={`Seal a packet for ${collateralCode}`} className="btn-secondary whitespace-nowrap text-xs">
        <PackageCheck size={13} /> {pending ? 'Sealing…' : 'Seal into a packet'}
      </button>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
}
