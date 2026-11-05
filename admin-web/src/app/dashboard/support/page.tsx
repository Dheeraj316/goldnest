import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { Paginated, SupportTicket } from '@/lib/types';
import { NewTicketForm } from './NewTicketForm';

export const metadata: Metadata = { title: 'Support Tickets' };

const TABS = [
  { key: 'open', label: 'Open' },
  { key: 'mine', label: 'Assigned to me' },
  { key: 'all', label: 'All' },
] as const;
type Tab = (typeof TABS)[number]['key'];

const PRIORITY_TONE: Record<string, string> = { CRITICAL: 'text-rose-600', HIGH: 'text-amber-700', MEDIUM: 'text-ink-light', LOW: 'text-ink-light/60' };

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const active: Tab = (TABS.find((t) => t.key === tab)?.key ?? 'open') as Tab;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'ticket.manage');

  const query = active === 'open' ? '?status=OPEN&pageSize=100' : active === 'mine' ? '?assignedToMe=true&pageSize=100' : '?pageSize=100';
  const tickets = await apiFetch<Paginated<SupportTicket>>(`/support-tickets${query}`);

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Issues raised by customers, or on their behalf by staff — from a first-payment question to a complaint."
        action={canManage ? <NewTicketForm /> : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/dashboard/support?tab=${t.key}`}
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
                <th className="px-5 py-3">Ticket</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Assigned to</th>
                <th className="px-5 py-3">Raised</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {tickets.items.map((t) => (
                <tr key={t.id}>
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/support/${t.id}`} className="font-medium text-ink hover:text-gold-700">
                      {t.ticketNumber}
                    </Link>
                    {t.loan && <p className="text-xs text-ink-light/70">{t.loan.loanNumber}</p>}
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {t.customer.name}
                    <p className="text-xs text-ink-light/70">{t.customer.customerCode}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">{t.category}</td>
                  <td className={`px-5 py-3.5 font-medium ${PRIORITY_TONE[t.priority] ?? ''}`}>{t.priority}</td>
                  <td className="px-5 py-3.5">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">{t.assigneeName ?? '—'}</td>
                  <td className="px-5 py-3.5 text-ink-light">{formatDateTime(t.createdAt)}</td>
                </tr>
              ))}
              {tickets.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-light/60">
                    {active === 'open' ? 'No open tickets.' : active === 'mine' ? 'Nothing assigned to you.' : 'No tickets yet.'}
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
