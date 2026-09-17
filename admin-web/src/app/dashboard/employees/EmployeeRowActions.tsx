'use client';

import { useState, useTransition } from 'react';
import { Power, PowerOff, KeyRound, Copy, Check } from 'lucide-react';
import { activateEmployeeAction, deactivateEmployeeAction, resetEmployeeAccessAction } from '@/lib/actions/employees';

export function EmployeeRowActions({ id, status }: { id: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
      {status === 'ACTIVE' ? (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => deactivateEmployeeAction(id))}
          className="flex items-center gap-1 rounded-md border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
        >
          <PowerOff size={13} /> Deactivate
        </button>
      ) : (
        <button
          disabled={isPending}
          onClick={() => startTransition(() => activateEmployeeAction(id))}
          className="flex items-center gap-1 rounded-md border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
        >
          <Power size={13} /> Activate
        </button>
      )}

      <button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await resetEmployeeAccessAction(id);
            setTempPassword(result.temporaryPassword || 'Password reset (custom password provided)');
          })
        }
        className="flex items-center gap-1 rounded-md border border-navy-900/15 px-2.5 py-1.5 text-xs font-medium text-ink-light hover:border-gold-400 hover:text-gold-700 disabled:opacity-50"
      >
        <KeyRound size={13} /> Reset access
      </button>

      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setTempPassword(null)}>
          <div className="w-full max-w-sm rounded-xl2 bg-white p-6 shadow-soft" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-ink">Access reset</h3>
            <p className="mt-1.5 text-sm text-ink-light">
              Share this temporary password with the employee securely. It will not be shown again.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold-200 bg-gold-50 px-3.5 py-2.5">
              <code className="flex-1 break-all text-sm font-semibold text-ink">{tempPassword}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="text-gold-600 hover:text-gold-700"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
            <button onClick={() => setTempPassword(null)} className="btn-primary mt-5 w-full">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
