import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, ApiError } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { PacketDetail, Vault } from '@/lib/types';
import { PacketActions } from './PacketActions';

export const metadata: Metadata = { title: 'Packet' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-light">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

export default async function PacketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, p] = await Promise.all([
    getCurrentUser(),
    apiFetch<PacketDetail>(`/vault/packets/${id}`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }),
  ]);
  const canManage = hasPermission(user, 'vault.manage');
  const vaults = canManage ? await apiFetch<Vault[]>('/vault/vaults') : [];

  return (
    <div>
      <Link href="/dashboard/vault" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink">
        <ArrowLeft size={15} /> Back to vault
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{p.packetNumber}</h1>
          <p className="mt-1 text-sm text-ink-light">
            {p.collateral.loanNumber} · {p.collateral.customerName} ({p.collateral.customerCode})
          </p>
        </div>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <PacketActions packet={p} vaults={vaults} canManage={canManage} />

          <section aria-label="Movement history" className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Movement history</h2>
            <ol className="mt-4 space-y-4 border-l border-gold-100 pl-4">
              {p.movements.map((m) => (
                <li key={m.id} className="relative">
                  <span className="absolute -left-[1.32rem] top-1 h-2 w-2 rounded-full bg-gold-400" />
                  <p className="text-sm font-medium text-ink">{m.reason}</p>
                  <p className="text-xs text-ink-light/70">
                    {formatDateTime(m.occurredAt)} · {m.by ?? 'Unknown'}
                    {m.fromLocation || m.toLocation ? ` · ${m.fromLocation ?? 'sealed'} → ${m.toLocation ?? '—'}` : ''}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-4">
          <section aria-label="The packet" className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">The packet</h2>
            <dl className="mt-3 divide-y divide-gold-100">
              <Row label="Seal number">{p.sealNumber}</Row>
              <Row label="Sealed on">{formatDateTime(p.createdAt)}</Row>
              <Row label="Location">{p.location ? p.location.path : '—'}</Row>
            </dl>
          </section>

          <section aria-label="Pledged gold" className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Pledged gold</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-ink-light/60">
              {p.collateral.collateralCode} · <StatusBadge status={p.collateral.status} />
            </p>
            <ul className="mt-3 divide-y divide-gold-100">
              {p.collateral.items.map((i) => (
                <li key={i.id} className="flex justify-between py-1.5 text-sm">
                  <span className="text-ink-light">{i.itemType}</span>
                  <span className="font-medium text-ink">
                    {i.netWeight}g · {i.purityKarat}K
                  </span>
                </li>
              ))}
            </ul>
            <Link href={`/dashboard/loans/${p.collateral.loanId}`} className="mt-3 inline-block text-sm font-medium text-gold-700 hover:underline">
              View the loan →
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
