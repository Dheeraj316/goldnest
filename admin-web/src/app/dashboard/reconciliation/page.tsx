import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { BankTransaction, Paginated } from '@/lib/types';
import { ImportLineForm } from './ImportLineForm';
import { BankLineRow } from './BankLineRow';

export const metadata: Metadata = { title: 'Bank Reconciliation' };

const TABS = [
  { key: 'unmatched', label: 'Unmatched', param: 'matched=false' },
  { key: 'matched', label: 'Matched', param: 'matched=true' },
] as const;
type Tab = (typeof TABS)[number]['key'];

export default async function ReconciliationPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: Tab = (TABS.find((t) => t.key === tab)?.key ?? 'unmatched') as Tab;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'reconciliation.manage');

  const query = TABS.find((t) => t.key === active)!.param;
  const list = await apiFetch<Paginated<BankTransaction>>(`/reconciliation/bank-transactions?${query}&pageSize=100`);

  return (
    <div>
      <PageHeader
        title="Bank Reconciliation"
        description="Bank statement lines, matched against the ledger automatically where the amount and date line up exactly, or by hand where they don't."
        action={canManage ? <ImportLineForm /> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/reconciliation?tab=${t.key}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              t.key === active ? 'border-gold-400 bg-gold-50 text-gold-700' : 'border-navy-900/15 text-ink-light hover:border-gold-300'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                <th className="px-5 py-3">Bank ref</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Value date</th>
                <th className="px-5 py-3">Description</th>
                <th className="px-5 py-3">Match</th>
                {canManage && <th className="px-5 py-3 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {list.items.map((bt) => (
                <BankLineRow key={bt.id} line={bt} canManage={canManage} />
              ))}
              {list.items.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                    {active === 'unmatched' ? 'Nothing waiting to be matched.' : 'Nothing matched yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
