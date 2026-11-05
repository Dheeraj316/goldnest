import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { formatDate, formatDateTime } from '@/lib/format';
import type { CollectionCaseDetail } from '@/lib/types';
import { AssignForm, LogActivityForm, PromiseForm } from './CaseForms';

export const metadata: Metadata = { title: 'Collection Case' };

export default async function CollectionCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'collection.manage');
  const canAssign = hasPermission(user, 'collection.assign');

  const [c, officers] = await Promise.all([
    apiFetch<CollectionCaseDetail>(`/collections/cases/${id}`),
    canAssign ? apiFetch<{ id: string; firstName: string; lastName: string | null; employeeCode: string }[]>(`/collections/cases/${id}/assignees`) : Promise.resolve([]),
  ]);
  const isOpen = c.status === 'OPEN';

  return (
    <div>
      <Link href="/dashboard/collections" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700">
        <ArrowLeft size={14} /> Back to collections
      </Link>
      <PageHeader
        title={c.caseNumber}
        description={`${c.customer.firstName} ${c.customer.lastName ?? ''} · ${c.customer.mobile}`}
        action={
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            {isOpen && canManage && <LogActivityForm caseId={c.id} />}
            {isOpen && canManage && <PromiseForm caseId={c.id} outstandingTotal={c.outstanding ? Number(c.outstanding.total) : null} />}
            {isOpen && canAssign && <AssignForm caseId={c.id} officers={officers} />}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h2 className="font-display text-lg font-semibold text-ink">Loan</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-light">Loan</dt>
              <dd className="font-medium">
                <Link href={`/dashboard/loans/${c.loan.id}`} className="text-gold-700 hover:underline">
                  {c.loan.loanNumber}
                </Link>
              </dd>
            </div>
            <div className="flex justify-between"><dt className="text-ink-light">Status</dt><dd><StatusBadge status={c.loan.status} /></dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Product</dt><dd className="font-medium text-ink">{c.loan.product.name}</dd></div>
            {c.loan.maturityDate && <div className="flex justify-between"><dt className="text-ink-light">Matured</dt><dd className="font-medium text-ink">{formatDate(c.loan.maturityDate)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-light">Grace period</dt><dd className="font-medium text-ink">{c.loan.product.gracePeriodDays} days</dd></div>
            {isOpen && <div className="flex justify-between"><dt className="text-ink-light">Days past due</dt><dd className="font-semibold text-rose-600">{c.daysPastDue}</dd></div>}
            <div className="flex justify-between">
              <dt className="text-ink-light">Assigned to</dt>
              <dd className="font-medium text-ink">{c.assignee ? `${c.assignee.firstName} ${c.assignee.lastName ?? ''}` : <span className="text-rose-500">Unassigned</span>}</dd>
            </div>
            <div className="flex justify-between"><dt className="text-ink-light">Opened</dt><dd className="font-medium text-ink">{formatDateTime(c.openedAt)}</dd></div>
            {c.closedAt && <div className="flex justify-between"><dt className="text-ink-light">Closed</dt><dd className="font-medium text-ink">{formatDateTime(c.closedAt)}</dd></div>}
            {c.closeReason && <div className="flex justify-between"><dt className="text-ink-light">Reason</dt><dd className="font-medium text-ink">{c.closeReason}</dd></div>}
          </dl>

          {c.outstanding && (
            <div className="mt-5 rounded-lg border border-gold-200 bg-gold-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold-700">Outstanding today</p>
              <dl className="mt-2 space-y-1.5 text-sm">
                <div className="flex justify-between"><dt className="text-ink-light">Principal</dt><dd>₹{Number(c.outstanding.principal).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-light">Interest</dt><dd>₹{Number(c.outstanding.interest).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-light">Charges</dt><dd>₹{Number(c.outstanding.charges).toLocaleString('en-IN')}</dd></div>
                <div className="flex justify-between border-t border-gold-200 pt-1.5 font-semibold text-ink"><dt>Total</dt><dd>₹{Number(c.outstanding.total).toLocaleString('en-IN')}</dd></div>
              </dl>
            </div>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Promises to pay</h2>
            {c.promises.length === 0 ? (
              <p className="mt-4 text-sm text-ink-light/60">No promises recorded.</p>
            ) : (
              <ul className="mt-4 divide-y divide-gold-100">
                {c.promises.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <span className="font-medium text-ink">₹{Number(p.promisedAmount).toLocaleString('en-IN')}</span>
                      <span className="ml-2 text-ink-light">by {formatDate(p.promisedDate)}</span>
                    </div>
                    <StatusBadge status={p.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Timeline</h2>
            <ul className="mt-4 space-y-4">
              {c.activities.map((a) => (
                <li key={a.id} className="border-b border-gold-100 pb-3 text-sm last:border-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-ink">
                      {a.type === 'SYSTEM' ? 'System' : a.type}
                      {a.outcome && <span className="ml-2 font-normal text-ink-light">· {a.outcome.replace(/_/g, ' ')}</span>}
                    </p>
                    <span className="text-xs text-ink-light/60">{formatDateTime(a.occurredAt)}</span>
                  </div>
                  {a.notes && <p className="mt-1 text-ink-light">{a.notes}</p>}
                  {a.employee && <p className="mt-0.5 text-xs text-ink-light/60">{a.employee.firstName} {a.employee.lastName ?? ''}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
