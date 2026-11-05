'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Lock, Search } from 'lucide-react';
import { saveRoleAccessAction } from '@/lib/actions/roles';
import { diffSets, groupPermissions, isReserved, isSensitive, RESERVED_NOTE } from '@/lib/access';
import type { Permission } from '@/lib/types';
import { ToggleSwitch } from '@/components/access/ToggleSwitch';
import { SaveBar } from '@/components/access/SaveBar';
import { ReviewChangesDialog } from '@/components/access/ReviewChangesDialog';

type View = 'all' | 'on' | 'off' | 'changed';

export function AccessEditor({
  roleId,
  roleName,
  employeeCount,
  permissions,
  initialCodes,
  actorCodes,
  lockedReason,
}: {
  roleId: string;
  roleName: string;
  employeeCount: number;
  permissions: Permission[];
  initialCodes: string[];
  actorCodes: string[];
  /** Set when this role's access cannot be edited by the current person; the switches are then read-only. */
  lockedReason: string | null;
}) {
  const router = useRouter();
  const [baseline, setBaseline] = useState<Set<string>>(new Set(initialCodes));
  const [checked, setChecked] = useState<Set<string>>(new Set(initialCodes));
  const [query, setQuery] = useState('');
  const [view, setView] = useState<View>('all');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const readOnly = lockedReason !== null;
  const actorHolds = useMemo(() => new Set(actorCodes), [actorCodes]);
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const byCode = useMemo(() => new Map(permissions.map((p) => [p.code, p])), [permissions]);
  const diff = diffSets(baseline, checked);

  // You can only switch ON what you hold yourself (and never a Super-Admin-only permission); switching OFF is always available.
  const canSwitchOn = (code: string) => actorHolds.has(code) && !isReserved(code);

  function set(code: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(code);
      else next.delete(code);
      return next;
    });
    setJustSaved(false);
  }

  function setGroup(codes: string[], on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const c of codes) {
        if (on) {
          if (canSwitchOn(c)) next.add(c);
        } else next.delete(c);
      }
      return next;
    });
    setJustSaved(false);
  }

  const q = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      permissions: g.permissions.filter((p) => {
        const on = checked.has(p.code);
        const changed = on !== baseline.has(p.code);
        if (view === 'on' && !on) return false;
        if (view === 'off' && on) return false;
        if (view === 'changed' && !changed) return false;
        if (!q) return true;
        return `${p.code} ${p.description ?? ''} ${g.label}`.toLowerCase().includes(q);
      }),
    }))
    .filter((g) => g.permissions.length > 0);

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await saveRoleAccessAction([{ roleId, grant: diff.granted, revoke: diff.revoked }]);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBaseline(new Set(checked));
      setReviewing(false);
      setJustSaved(true);
      router.refresh();
    });
  }

  const entries = [
    {
      roleId,
      roleName,
      employeeCount,
      granted: diff.granted.map((c) => byCode.get(c)).filter((p): p is Permission => !!p),
      revoked: diff.revoked.map((c) => byCode.get(c)).filter((p): p is Permission => !!p),
    },
  ];

  return (
    <div>
      {readOnly && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-gold-200 bg-gold-50/70 p-3.5 text-sm text-ink" role="note">
          <Lock size={16} className="mt-0.5 shrink-0 text-gold-600" />
          <span>{lockedReason}</span>
        </div>
      )}
      {justSaved && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800" role="status">
          <CheckCircle2 size={16} className="shrink-0" /> Saved. The new access applies right away — {roleName} employees do not need to sign in again.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search permissions…" aria-label="Search permissions" className="input pl-9" />
        </div>
        <div className="inline-flex rounded-lg border border-navy-900/15 bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Filter permissions">
          {(
            [
              ['all', 'All'],
              ['on', 'On'],
              ['off', 'Off'],
              ['changed', 'Changed'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-md px-3 py-1.5 transition ${view === v ? 'bg-navy-900 text-white' : 'text-ink-light hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-light">
          <strong className="text-ink">{checked.size}</strong> of {permissions.length} on
        </p>
      </div>

      <div className="space-y-4">
        {visibleGroups.map((g) => {
          const codes = g.permissions.map((p) => p.code);
          const onCount = codes.filter((c) => checked.has(c)).length;
          return (
            <section key={g.resource} className="rounded-xl border border-gold-100" aria-label={g.label}>
              <header className="flex items-center justify-between gap-3 border-b border-gold-100 bg-gold-50/40 px-4 py-2.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gold-700">
                  {g.label} <span className="ml-1 font-normal normal-case text-ink-light/60">{onCount}/{codes.length} on</span>
                </h3>
                {!readOnly && (
                  <div className="flex gap-3 text-xs font-medium">
                    <button type="button" onClick={() => setGroup(codes, true)} className="text-emerald-700 hover:underline">
                      Switch all on
                    </button>
                    <button type="button" onClick={() => setGroup(codes, false)} className="text-rose-700 hover:underline">
                      Switch all off
                    </button>
                  </div>
                )}
              </header>
              <ul className="divide-y divide-gold-100/70">
                {g.permissions.map((p) => {
                  const on = checked.has(p.code);
                  const changed = on !== baseline.has(p.code);
                  const cannotGrant = !on && !canSwitchOn(p.code);
                  return (
                    <li key={p.code} className={`flex items-center justify-between gap-4 px-4 py-3 ${changed ? 'bg-gold-50/50' : ''}`}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink">
                          {p.description ?? p.code}
                          {isSensitive(p.code) && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-700">Sensitive</span>}
                          {changed && <span className="ml-2 align-middle text-[10px] font-semibold uppercase tracking-wide text-gold-700">{on ? 'will switch on' : 'will switch off'}</span>}
                        </p>
                        <p className="font-mono text-[11px] text-ink-light/60">{p.code}</p>
                        {cannotGrant && !readOnly && (
                          <p className="mt-0.5 text-[11px] text-ink-light/70">{isReserved(p.code) ? RESERVED_NOTE : 'You do not hold this access yourself, so you cannot switch it on.'}</p>
                        )}
                      </div>
                      <ToggleSwitch
                        checked={on}
                        changed={changed}
                        disabled={readOnly || cannotGrant}
                        label={`${p.description ?? p.code} for ${roleName}`}
                        title={cannotGrant ? (isReserved(p.code) ? RESERVED_NOTE : 'You cannot grant access you do not hold') : undefined}
                        onChange={(next) => set(p.code, next)}
                      />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
        {visibleGroups.length === 0 && <p className="rounded-xl border border-dashed border-gold-200 p-8 text-center text-sm text-ink-light">No permissions match.</p>}
      </div>

      {!readOnly && <SaveBar enabled={diff.granted.length} disabled={diff.revoked.length} onDiscard={() => setChecked(new Set(baseline))} onReview={() => { setError(null); setReviewing(true); }} />}

      {reviewing && <ReviewChangesDialog entries={entries} pending={pending} error={error} onConfirm={confirm} onCancel={() => setReviewing(false)} />}
    </div>
  );
}
