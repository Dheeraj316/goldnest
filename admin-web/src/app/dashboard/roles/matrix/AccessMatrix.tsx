'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Lock, Search } from 'lucide-react';
import { saveRoleAccessAction } from '@/lib/actions/roles';
import { diffSets, groupPermissions, isReserved, isSensitive, RESERVED_NOTE } from '@/lib/access';
import type { Permission } from '@/lib/types';
import { ToggleSwitch } from '@/components/access/ToggleSwitch';
import { SaveBar } from '@/components/access/SaveBar';
import { ReviewChangesDialog, type ReviewEntry } from '@/components/access/ReviewChangesDialog';

export interface MatrixRole {
  id: string;
  code: string;
  name: string;
  employeeCount: number;
  codes: string[];
  /** Why this role's column is read-only for the current person, or null when it can be edited. */
  lockedReason: string | null;
}

// Every role side by side: one row per permission, one column per role. It is the quickest way to see
// who can do what, and to switch access on or off across several roles before saving them together.
export function AccessMatrix({ roles, permissions, actorCodes }: { roles: MatrixRole[]; permissions: Permission[]; actorCodes: string[] }) {
  const router = useRouter();
  const toSets = (rs: MatrixRole[]) => Object.fromEntries(rs.map((r) => [r.id, new Set(r.codes)])) as Record<string, Set<string>>;
  const [baseline, setBaseline] = useState<Record<string, Set<string>>>(() => toSets(roles));
  const [checked, setChecked] = useState<Record<string, Set<string>>>(() => toSets(roles));
  const [query, setQuery] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const actorHolds = useMemo(() => new Set(actorCodes), [actorCodes]);
  const groups = useMemo(() => groupPermissions(permissions), [permissions]);
  const byCode = useMemo(() => new Map(permissions.map((p) => [p.code, p])), [permissions]);

  const diffs = roles
    .map((r) => ({ role: r, ...diffSets(baseline[r.id], checked[r.id]) }))
    .filter((d) => d.granted.length + d.revoked.length > 0);
  const totalOn = diffs.reduce((n, d) => n + d.granted.length, 0);
  const totalOff = diffs.reduce((n, d) => n + d.revoked.length, 0);

  function toggle(roleId: string, code: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev[roleId]);
      if (on) next.add(code);
      else next.delete(code);
      return { ...prev, [roleId]: next };
    });
    setJustSaved(false);
  }

  const q = query.trim().toLowerCase();
  const visible = groups
    .map((g) => ({ ...g, permissions: g.permissions.filter((p) => !q || `${p.code} ${p.description ?? ''} ${g.label}`.toLowerCase().includes(q)) }))
    .filter((g) => g.permissions.length > 0);

  const entries: ReviewEntry[] = diffs.map((d) => ({
    roleId: d.role.id,
    roleName: d.role.name,
    employeeCount: d.role.employeeCount,
    granted: d.granted.map((c) => byCode.get(c)).filter((p): p is Permission => !!p),
    revoked: d.revoked.map((c) => byCode.get(c)).filter((p): p is Permission => !!p),
  }));

  function confirm() {
    setError(null);
    startTransition(async () => {
      const res = await saveRoleAccessAction(diffs.map((d) => ({ roleId: d.role.id, grant: d.granted, revoke: d.revoked })));
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBaseline(Object.fromEntries(Object.entries(checked).map(([id, s]) => [id, new Set(s)])));
      setReviewing(false);
      setJustSaved(true);
      router.refresh();
    });
  }

  return (
    <div>
      {justSaved && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800" role="status">
          <CheckCircle2 size={16} className="shrink-0" /> Saved. The new access applies right away — no one needs to sign in again.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-light/50" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search permissions…" aria-label="Search permissions" className="input pl-9" />
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-light">
          <Lock size={12} /> Locked columns cannot be changed by you.
        </p>
      </div>

      <div className="max-h-[68vh] overflow-auto rounded-xl border border-gold-100 bg-white">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-[260px] border-b border-r border-gold-100 bg-cream-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">Permission</th>
              {roles.map((r) => (
                <th key={r.id} className="sticky top-0 z-20 min-w-[112px] border-b border-gold-100 bg-cream-50 px-2 py-3 text-center align-bottom">
                  <Link href={`/dashboard/roles/${r.id}`} className="block text-xs font-semibold leading-tight text-ink hover:text-gold-700" title={`Open ${r.name}`}>
                    {r.name}
                  </Link>
                  <span className="mt-0.5 flex items-center justify-center gap-1 text-[10px] font-normal text-ink-light/60">
                    {r.lockedReason && <Lock size={10} aria-label="Locked" />}
                    {r.employeeCount} staff · {checked[r.id].size} on
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((g) => (
              <MatrixGroup key={g.resource} label={g.label} colSpan={roles.length + 1}>
                {g.permissions.map((p) => (
                  <tr key={p.code} className="group">
                    <td className="sticky left-0 z-10 border-b border-r border-gold-100/70 bg-white px-4 py-2 group-hover:bg-gold-50/40">
                      <span className="text-[13px] font-medium text-ink">{p.description ?? p.code}</span>
                      {isSensitive(p.code) && <span className="ml-1.5 rounded bg-amber-50 px-1 py-0.5 align-middle text-[9px] font-semibold uppercase tracking-wide text-amber-700">Sensitive</span>}
                      <span className="block font-mono text-[10px] text-ink-light/55">{p.code}</span>
                    </td>
                    {roles.map((r) => {
                      const on = checked[r.id].has(p.code);
                      const changed = on !== baseline[r.id].has(p.code);
                      const cannotGrant = !on && (!actorHolds.has(p.code) || isReserved(p.code));
                      const locked = r.lockedReason !== null;
                      return (
                        <td key={r.id} className={`border-b border-gold-100/70 px-2 py-2 text-center group-hover:bg-gold-50/40 ${changed ? 'bg-gold-50/60' : ''}`}>
                          <ToggleSwitch
                            size="sm"
                            checked={on}
                            changed={changed}
                            disabled={locked || cannotGrant}
                            label={`${p.description ?? p.code} for ${r.name}`}
                            title={locked ? r.lockedReason ?? undefined : cannotGrant ? (isReserved(p.code) ? RESERVED_NOTE : 'You cannot grant access you do not hold') : undefined}
                            onChange={(next) => toggle(r.id, p.code, next)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </MatrixGroup>
            ))}
          </tbody>
        </table>
      </div>

      <SaveBar enabled={totalOn} disabled={totalOff} onDiscard={() => setChecked(Object.fromEntries(Object.entries(baseline).map(([id, s]) => [id, new Set(s)])))} onReview={() => { setError(null); setReviewing(true); }} />
      {reviewing && <ReviewChangesDialog entries={entries} pending={pending} error={error} onConfirm={confirm} onCancel={() => setReviewing(false)} />}
    </div>
  );
}

function MatrixGroup({ label, colSpan, children }: { label: string; colSpan: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <td colSpan={colSpan} className="sticky left-0 border-b border-gold-100 bg-gold-50/60 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
          {label}
        </td>
      </tr>
      {children}
    </>
  );
}
