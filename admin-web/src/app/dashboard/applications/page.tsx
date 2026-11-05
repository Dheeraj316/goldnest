import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { LoanApplication, LoanProduct, Paginated, Branch, Customer } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { NewApplicationForm } from './NewApplicationForm';

export const metadata: Metadata = { title: 'Loan Applications' };

export default async function ApplicationsPage() {
  const user = await getCurrentUser();
  // The three lookups below only feed the "New application" form. Fetching them
  // for everyone made this page 403 for any role that can view applications but
  // lacks branch.view / loan_product.view (appraiser, customer support, and
  // even the loan officer, who has no branch.view). /branches/active needs auth
  // only, so it works for every role that can create an application.
  const canCreate = hasPermission(user, 'loan_application.create');
  const [result, products, branchList, customers] = await Promise.all([
    apiFetch<Paginated<LoanApplication>>('/loan-applications?pageSize=50'),
    canCreate ? apiFetch<LoanProduct[]>('/loan-products?activeOnly=true') : Promise.resolve<LoanProduct[]>([]),
    canCreate ? apiFetch<Branch[]>('/branches/active') : Promise.resolve<Branch[]>([]),
    canCreate ? apiFetch<Paginated<Customer>>('/customers?pageSize=100') : Promise.resolve<Paginated<Customer> | null>(null),
  ]);

  return (
    <div>
      <PageHeader
        title="Loan Applications"
        description={`${result.total} application${result.total === 1 ? '' : 's'}`}
        action={canCreate ? <NewApplicationForm products={products} branches={branchList} customers={customers?.items ?? []} /> : undefined}
      />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                <th className="px-5 py-3">Application</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Requested</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {result.items.map((app) => (
                <tr key={app.id}>
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/applications/${app.id}`} className="font-medium text-ink hover:text-gold-700">
                      {app.applicationNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {app.customer ? `${app.customer.firstName} ${app.customer.lastName ?? ''}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">{app.product?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-ink-light">₹{Number(app.requestedAmount).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={app.status} /></td>
                  <td className="px-5 py-3.5 text-ink-light">{formatDateTime(app.submittedAt)}</td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-light/60">No applications yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
