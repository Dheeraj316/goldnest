import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { CollateralAwaitingPacket, PacketListItem, Paginated, Vault } from '@/lib/types';
import { SealPacketButton } from './SealPacketButton';
import { VaultAdmin } from './VaultAdmin';

export const metadata: Metadata = { title: 'Vault' };

const TABS = [
  { key: 'awaiting', label: 'Awaiting a packet' },
  { key: 'inside', label: 'In the vault' },
  { key: 'closed', label: 'Closed out' },
] as const;

type Tab = (typeof TABS)[number]['key'];
const INSIDE_STATUSES = 'RECEIVED,STORED,MOVED,AUDITED';
const CLOSED_STATUSES = 'RELEASED,AUCTIONED,DESTROYED';

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: Tab = (TABS.find((t) => t.key === tab)?.key ?? 'awaiting') as Tab;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'vault.manage');

  // The API filters by one status at a time; a vault rarely holds enough packets that fetching the lot once
  // and splitting it client-side is a real cost, and it keeps the three tab counts from ever disagreeing.
  const [vaults, awaiting, packets] = await Promise.all([
    apiFetch<Vault[]>('/vault/vaults'),
    apiFetch<CollateralAwaitingPacket[]>('/vault/collateral-awaiting'),
    apiFetch<Paginated<PacketListItem>>('/vault/packets?pageSize=100'),
  ]);
  const insideItems = packets.items.filter((p) => INSIDE_STATUSES.includes(p.status));
  const closedItems = packets.items.filter((p) => CLOSED_STATUSES.includes(p.status));
  const counts: Record<Tab, number> = { awaiting: awaiting.length, inside: insideItems.length, closed: closedItems.length };

  return (
    <div>
      <PageHeader title="Vault" description="Physical custody of the gold pledged across every loan — sealed into a packet, stored, moved and, eventually, handed back or sold." />

      <VaultAdmin vaults={vaults} canManage={canManage} />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/vault?tab=${t.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              t.key === active ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-900/15 text-ink-light hover:border-gold-300'
            }`}
          >
            {t.label} <span className="ml-1 text-xs opacity-70">{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      {active === 'awaiting' && (
        <div className="card overflow-hidden">
          <p className="border-b border-gold-100 bg-gold-50/40 px-5 py-3 text-xs text-ink-light">
            Pledged gold that has passed appraisal but has no active packet yet. Sealing it here only creates the packet — it still needs to be placed at a location before it
            counts as stored.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="px-5 py-3">Collateral</th>
                  <th className="px-5 py-3">Loan</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Branch</th>
                  <th className="px-5 py-3">Net weight</th>
                  {canManage && <th className="px-5 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {awaiting.map((c) => (
                  <tr key={c.collateralId}>
                    <td className="px-5 py-3.5 font-medium text-ink">{c.collateralCode}</td>
                    <td className="px-5 py-3.5 text-ink-light">{c.loanNumber}</td>
                    <td className="px-5 py-3.5 text-ink-light">
                      {c.customerName}
                      <p className="text-xs text-ink-light/70">{c.customerCode}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">{c.branch.code}</td>
                    <td className="px-5 py-3.5 text-ink-light">{c.items.map((i) => `${i.itemType} ${i.netWeight}g`).join(', ')}</td>
                    {canManage && (
                      <td className="px-5 py-3.5 text-right">
                        <SealPacketButton collateralId={c.collateralId} collateralCode={c.collateralCode} />
                      </td>
                    )}
                  </tr>
                ))}
                {awaiting.length === 0 && (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                      Nothing is waiting to be sealed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(active === 'inside' || active === 'closed') && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="px-5 py-3">Packet</th>
                  <th className="px-5 py-3">Loan</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">{active === 'inside' ? 'Location' : 'Collateral status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {(active === 'inside' ? insideItems : closedItems).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3.5">
                      <Link href={`/dashboard/vault/${p.id}`} className="font-medium text-ink hover:text-gold-700">
                        {p.packetNumber}
                      </Link>
                      <p className="text-xs text-ink-light/70">{p.collateralCode}</p>
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">{p.loanNumber}</td>
                    <td className="px-5 py-3.5 text-ink-light">{p.customerName}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-ink-light">{active === 'inside' ? (p.location ?? '—') : p.collateralStatus}</td>
                  </tr>
                ))}
                {(active === 'inside' ? insideItems : closedItems).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                      {active === 'inside' ? 'No packets are in the vault right now.' : 'Nothing has been released or sold yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
