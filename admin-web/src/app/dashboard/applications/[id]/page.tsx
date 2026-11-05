import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import type { LoanApplication } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { StartAppraisalButton } from './StartAppraisalButton';

export const metadata: Metadata = { title: 'Application Detail' };

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await apiFetch<LoanApplication>(`/loan-applications/${id}`);

  return (
    <div>
      <Link href="/dashboard/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700">
        <ArrowLeft size={14} /> Back to applications
      </Link>
      <PageHeader
        title={app.applicationNumber}
        description={`${app.customer?.firstName ?? ''} ${app.customer?.lastName ?? ''} — ${app.product?.name ?? ''}`}
        action={
          app.status === 'SUBMITTED' ? (
            <StartAppraisalButton applicationId={app.id} />
          ) : app.loan ? (
            <Link href={`/dashboard/loans/${app.loan.id}`} className="btn-primary">
              View loan {app.loan.loanNumber}
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Application details</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-light">Status</dt><dd><StatusBadge status={app.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Requested amount</dt><dd className="font-medium text-ink">₹{Number(app.requestedAmount).toLocaleString('en-IN')}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Requested tenure</dt><dd className="font-medium text-ink">{app.requestedTenureDays} days</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Branch</dt><dd className="font-medium text-ink">{app.branch?.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Purpose</dt><dd className="font-medium text-ink">{app.purpose || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Submitted</dt><dd className="font-medium text-ink">{formatDateTime(app.submittedAt)}</dd></div>
          </dl>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Status history</h2>
          <ul className="mt-4 space-y-3">
            {(app.statusHistory ?? []).map((h) => (
              <li key={h.id} className="flex items-start justify-between border-b border-gold-100 pb-2.5 text-sm last:border-0 last:pb-0">
                <div>
                  <StatusBadge status={h.toStatus} />
                  {h.reason && <p className="mt-1 text-xs text-ink-light/70">{h.reason}</p>}
                </div>
                <span className="whitespace-nowrap text-xs text-ink-light/60">{formatDateTime(h.changedAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
