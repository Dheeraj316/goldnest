'use client';

import { AlertTriangle, Minus, Plus, X } from 'lucide-react';
import type { Permission } from '@/lib/types';
import { isSensitive } from '@/lib/access';

export interface ReviewEntry {
  roleId: string;
  roleName: string;
  employeeCount: number;
  granted: Permission[];
  revoked: Permission[];
}

// The last look before access changes are saved: exactly what is being switched on and off, for which
// role, and how many people it affects. Nothing is written until this is confirmed.
export function ReviewChangesDialog({
  entries,
  pending,
  error,
  onConfirm,
  onCancel,
}: {
  entries: ReviewEntry[];
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const total = entries.reduce((n, e) => n + e.granted.length + e.revoked.length, 0);
  const people = entries.reduce((n, e) => n + e.employeeCount, 0);
  const sensitiveOn = entries.flatMap((e) => e.granted).filter((p) => isSensitive(p.code)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={pending ? undefined : onCancel} />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gold-100 px-6 py-5">
          <div>
            <h2 id="review-title" className="font-display text-lg font-semibold text-ink">
              Review access changes
            </h2>
            <p className="mt-0.5 text-sm text-ink-light">
              {total} change{total === 1 ? '' : 's'} across {entries.length} role{entries.length === 1 ? '' : 's'}
            </p>
          </div>
          <button onClick={onCancel} disabled={pending} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-light/60 hover:bg-gold-50 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {entries.map((e) => (
            <div key={e.roleId}>
              <p className="text-sm font-semibold text-ink">
                {e.roleName} <span className="font-normal text-ink-light/60">· {e.employeeCount} employee{e.employeeCount === 1 ? '' : 's'}</span>
              </p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {e.granted.map((p) => (
                  <li key={p.code} className="flex items-start gap-2 text-emerald-700">
                    <Plus size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Switch <strong>on</strong>: {p.description ?? p.code}
                      {isSensitive(p.code) && <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">Sensitive</span>}
                    </span>
                  </li>
                ))}
                {e.revoked.map((p) => (
                  <li key={p.code} className="flex items-start gap-2 text-rose-700">
                    <Minus size={14} className="mt-0.5 shrink-0" />
                    <span>
                      Switch <strong>off</strong>: {p.description ?? p.code}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="rounded-lg bg-gold-50/70 p-3 text-xs leading-relaxed text-ink-light">
            Takes effect <strong>immediately</strong> for {people} employee{people === 1 ? '' : 's'} in {entries.length === 1 ? 'this role' : 'these roles'} — they do not need to sign in
            again. The change is recorded in the audit log under your name.
            {sensitiveOn > 0 && (
              <span className="mt-1.5 flex items-start gap-1.5 text-amber-700">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {sensitiveOn} sensitive permission{sensitiveOn === 1 ? '' : 's'} being switched on — check this is intended.
              </span>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gold-100 px-6 py-4">
          <button onClick={onCancel} disabled={pending} className="btn-secondary">
            Go back
          </button>
          <button onClick={onConfirm} disabled={pending} className="btn-primary">
            {pending ? 'Saving…' : 'Confirm & save'}
          </button>
        </div>
      </div>
    </div>
  );
}
