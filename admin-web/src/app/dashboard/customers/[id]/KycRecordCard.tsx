'use client';

import { useState, useTransition } from 'react';
import { Check, X } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { reviewKycAction } from '@/lib/actions/customers';
import type { KycRecord } from '@/lib/types';

export function KycRecordCard({ record, customerId, canReview }: { record: KycRecord; customerId: string; canReview: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const isPendingReview = record.status === 'PENDING' || record.status === 'IN_REVIEW';

  return (
    <div className="rounded-xl border border-gold-100 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-ink">{record.docType.replace(/_/g, ' ')}</p>
          <p className="mt-0.5 font-mono text-sm text-ink-light">{record.maskedNumber}</p>
        </div>
        <StatusBadge status={record.status} />
      </div>

      {record.rejectionReason && <p className="mt-2 text-xs text-rose-600">Reason: {record.rejectionReason}</p>}

      {canReview && isPendingReview && !rejecting && (
        <div className="mt-3 flex gap-2">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => reviewKycAction(record.id, customerId, 'VERIFIED'))}
            className="flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
          >
            <Check size={13} /> Verify
          </button>
          <button
            disabled={isPending}
            onClick={() => setRejecting(true)}
            className="flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50"
          >
            <X size={13} /> Reject
          </button>
        </div>
      )}

      {rejecting && (
        <div className="mt-3 space-y-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for rejection"
            className="input text-sm"
          />
          <div className="flex gap-2">
            <button
              disabled={isPending || !reason.trim()}
              onClick={() => startTransition(() => reviewKycAction(record.id, customerId, 'REJECTED', reason.trim()))}
              className="btn-danger !px-3 !py-1.5 text-xs"
            >
              Confirm reject
            </button>
            <button onClick={() => setRejecting(false)} className="btn-secondary !px-3 !py-1.5 text-xs">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
