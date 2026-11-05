'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { auditPacketAction, closeOutPacketAction, movePacketAction, storePacketAction } from '@/lib/actions/vault';
import type { PacketDetail, Vault } from '@/lib/types';

type Result = { ok: true; id?: string } | { ok: false; error: string };

function useStep() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<Result>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      after?.();
      router.refresh();
    });
  };
  return { pending, error, run };
}

function Card({ title, hint, children, tone = 'default' }: { title: string; hint?: ReactNode; children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <section className={`rounded-xl border p-5 ${tone === 'danger' ? 'border-rose-200 bg-rose-50/40' : 'border-gold-100 bg-white'}`}>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {hint && <p className="mt-1 text-sm text-ink-light">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {error}
    </p>
  ) : null;
}

function flattenLocations(vaults: Vault[]): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const walk = (nodes: Vault['locations'], vaultName: string, prefix: string) =>
    nodes.forEach((n) => {
      out.push({ id: n.id, label: `${vaultName} — ${prefix}${n.type} ${n.code}` });
      walk(n.children, vaultName, prefix + '— ');
    });
  vaults.forEach((v) => walk(v.locations, v.name, ''));
  return out;
}

function LocationPicker({ id, value, onChange, locations }: { id: string; value: string; onChange: (v: string) => void; locations: { id: string; label: string }[] }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">— choose a location —</option>
      {locations.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label}
        </option>
      ))}
    </select>
  );
}

function StoreCard({ p, locations }: { p: PacketDetail; locations: { id: string; label: string }[] }) {
  const { pending, error, run } = useStep();
  const [loc, setLoc] = useState('');
  const [reason, setReason] = useState('');
  return (
    <Card title="Place the packet" hint="First placement in the vault also carries the pledged gold's record from APPRAISED to STORED.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (loc) run(() => storePacketAction(p.id, loc, reason));
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="store-loc" className="label">
            Location
          </label>
          <LocationPicker id="store-loc" value={loc} onChange={setLoc} locations={locations} />
        </div>
        <div>
          <label htmlFor="store-reason" className="label">
            Reason (optional)
          </label>
          <input id="store-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="input" placeholder="Initial storage" />
        </div>
        <button type="submit" disabled={pending || !loc} className="btn-primary">
          {pending ? 'Storing…' : 'Store here'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function MoveCard({ p, locations }: { p: PacketDetail; locations: { id: string; label: string }[] }) {
  const { pending, error, run } = useStep();
  const [loc, setLoc] = useState('');
  const [reason, setReason] = useState('');
  const others = locations.filter((l) => l.id !== p.location?.id);
  return (
    <Card title="Move it" hint="Every move needs a reason and is kept on the packet's record.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (loc && reason.trim()) run(() => movePacketAction(p.id, loc, reason), () => setReason(''));
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="move-loc" className="label">
            New location
          </label>
          <LocationPicker id="move-loc" value={loc} onChange={setLoc} locations={others} />
        </div>
        <div>
          <label htmlFor="move-reason" className="label">
            Reason
          </label>
          <input id="move-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="input" placeholder="Why is it moving?" />
        </div>
        <button type="submit" disabled={pending || !loc || reason.trim().length < 3} className="btn-primary">
          {pending ? 'Moving…' : 'Move'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

function AuditCard({ p }: { p: PacketDetail }) {
  const { pending, error, run } = useStep();
  const [notes, setNotes] = useState('');
  return (
    <Card title="Physical stock check" hint="Confirms whether the packet was actually found where the records say it is. Never changes the recorded location — only the audit trail.">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="audit-notes" className="label">
            Notes (optional, useful if it is missing)
          </label>
          <input id="audit-notes" value={notes} maxLength={300} onChange={(e) => setNotes(e.target.value)} className="input" />
        </div>
        <button type="button" disabled={pending} onClick={() => run(() => auditPacketAction(p.id, true, notes), () => setNotes(''))} className="btn-primary">
          {pending ? 'Recording…' : 'Present'}
        </button>
        <button type="button" disabled={pending} onClick={() => run(() => auditPacketAction(p.id, false, notes), () => setNotes(''))} className="btn-danger">
          Not found
        </button>
      </div>
      <ErrorText error={error} />
    </Card>
  );
}

function CloseOutCard({ p }: { p: PacketDetail }) {
  const { pending, error, run } = useStep();
  const [reason, setReason] = useState('');
  const target = p.collateral.status === 'RELEASED' ? 'back to the borrower' : p.collateral.status === 'AUCTIONED' ? 'to the winning bidder' : null;
  if (!target) {
    return (
      <Card title="Confirm the physical handover" hint="This becomes available once the branch has released the loan's collateral or the gold has been sold at auction.">
        <p className="text-sm text-ink-light/70">Nothing to confirm yet.</p>
      </Card>
    );
  }
  return (
    <Card title="Confirm the physical handover" hint={`The branch has authorised handing this gold ${target}. This records that it has physically left the vault.`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => closeOutPacketAction(p.id, reason));
        }}
        className="space-y-3"
      >
        <div>
          <label htmlFor="close-reason" className="label">
            Note (optional)
          </label>
          <input id="close-reason" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} className="input" />
        </div>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Confirming…' : 'Confirm handover'}
        </button>
      </form>
      <ErrorText error={error} />
    </Card>
  );
}

export function PacketActions({ packet: p, vaults, canManage }: { packet: PacketDetail; vaults: Vault[]; canManage: boolean }) {
  if (!canManage) {
    return <div className="rounded-xl border border-dashed border-gold-200 p-5 text-sm text-ink-light">You do not have access to take the next step here.</div>;
  }
  const locations = flattenLocations(vaults);
  const cards: ReactNode[] = [];
  if (p.status === 'RECEIVED') cards.push(<StoreCard key="store" p={p} locations={locations} />);
  if (['STORED', 'AUDITED'].includes(p.status)) {
    cards.push(<MoveCard key="move" p={p} locations={locations} />);
    cards.push(<AuditCard key="audit" p={p} />);
    cards.push(<CloseOutCard key="close" p={p} />);
  }
  if (cards.length === 0) {
    return <div className="rounded-xl border border-dashed border-gold-200 p-5 text-sm text-ink-light">This packet is {p.status.toLowerCase()} — there is nothing more to do.</div>;
  }
  return <div className="space-y-4">{cards}</div>;
}
