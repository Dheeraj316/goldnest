import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch, ApiError } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import type { AssignableEmployee, SupportTicket } from '@/lib/types';
import { TicketActions } from './TicketActions';

export const metadata: Metadata = { title: 'Support Ticket' };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-ink-light">{label}</dt>
      <dd className="text-right font-medium text-ink">{children}</dd>
    </div>
  );
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, t] = await Promise.all([
    getCurrentUser(),
    apiFetch<SupportTicket>(`/support-tickets/${id}`).catch((e) => {
      if (e instanceof ApiError && e.status === 404) notFound();
      throw e;
    }),
  ]);
  const canManage = hasPermission(user, 'ticket.manage');
  const employees = canManage ? await apiFetch<AssignableEmployee[]>('/support-tickets/assignable-employees') : [];

  return (
    <div>
      <Link href="/dashboard/support" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink">
        <ArrowLeft size={15} /> Back to support tickets
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">{t.ticketNumber}</h1>
          <p className="mt-1 text-sm text-ink-light">
            {t.customer.name} ({t.customer.customerCode}) · {t.customer.mobile}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="badge bg-gold-50 text-gold-700">{t.priority}</span>
          <StatusBadge status={t.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <section aria-label="The issue" className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">{t.category}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-light">{t.description}</p>
            {t.loan && (
              <Link href={`/dashboard/loans/${t.loan.id}`} className="mt-3 inline-block text-sm font-medium text-gold-700 hover:underline">
                {t.loan.loanNumber} →
              </Link>
            )}
          </section>

          <TicketActions ticket={t} employees={employees} canManage={canManage} />

          {t.resolutionNote && (
            <section aria-label="Resolution" className="card p-6">
              <h2 className="font-display text-lg font-semibold text-ink">Resolution note</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink-light">{t.resolutionNote}</p>
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section aria-label="Details" className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Details</h2>
            <dl className="mt-3 divide-y divide-gold-100">
              <Row label="Raised">{formatDateTime(t.createdAt)}</Row>
              <Row label="Last updated">{formatDateTime(t.updatedAt)}</Row>
              {t.slaDueAt && <Row label="Target by">{formatDateTime(t.slaDueAt)}</Row>}
              <Row label="Assigned to">{t.assigneeName ?? '—'}</Row>
              <Row label="Branch">{t.customer.branch ? t.customer.branch.name : '—'}</Row>
            </dl>
          </section>

          <Link href={`/dashboard/customers/${t.customer.id}`} className="card block p-6 text-sm font-medium text-gold-700 hover:underline">
            View the customer →
          </Link>
        </div>
      </div>
    </div>
  );
}
