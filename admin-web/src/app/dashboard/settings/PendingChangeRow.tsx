'use client';

import { useState, useTransition } from 'react';
import { Check, X, Lock } from 'lucide-react';
import { approveSettingChangeAction, rejectSettingChangeAction } from '@/lib/actions/settings';
import type { ConfigurationVersion } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

export function PendingChangeRow({ change, isOwnRequest, canApprove }: { change: ConfigurationVersion; isOwnRequest: boolean; canApprove: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  return (
    <div className="rounded-xl border border-gold-100 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{change.setting?.key}</p>
          <p className="mt-1 text-sm text-ink-light">
            <span className="text-ink-light/50 line-through">{JSON.stringify(change.previousValue) ?? 'unset'}</span>
            {' → '}
            <span className="font-semibold text-ink">{JSON.stringify(change.newValue)}</span>
          </p>
          {change.changeReason && <p className="mt-1 text-xs text-ink-light/60">Reason: {change.changeReason}</p>}
          <p className="mt-1 text-xs text-ink-light/40">Requested {formatDateTime(change.requestedAt)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isOwnRequest ? (
            <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-500" title="You requested this change — a different authorized user must approve it">
              <Lock size={12} /> Awaiting a different approver
            </span>
          ) : canApprove && !rejecting ? (
            <>
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await approveSettingChangeAction(change.id);
                    setError(result.error || null);
                  })
                }
                className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <Check size={13} /> Approve
              </button>
              <button
                disabled={isPending}
                onClick={() => setRejecting(true)}
                className="flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
              >
                <X size={13} /> Reject
              </button>
            </>
          ) : null}
        </div>
      </div>

      {rejecting && (
        <div className="mt-3 flex items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" className="input text-sm" />
          <button
            disabled={isPending || !reason.trim()}
            onClick={() =>
              startTransition(async () => {
                const result = await rejectSettingChangeAction(change.id, reason.trim());
                setError(result.error || null);
                if (!result.error) setRejecting(false);
              })
            }
            className="btn-danger shrink-0 !px-3 !py-1.5 text-xs"
          >
            Confirm
          </button>
          <button onClick={() => setRejecting(false)} className="btn-secondary shrink-0 !px-3 !py-1.5 text-xs">
            Cancel
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
