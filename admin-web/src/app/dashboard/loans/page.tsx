import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import type { Loan, Paginated } from '@/lib/types';
import { formatDate } from '@/lib/format';

export const metadata: Metadata = { title: 'Loans' };

export default async function LoansPage() {
  const result = await apiFetch<Paginated<Loan>>('/loans?pageSize=50');

  return (
    <div>
      <PageHeader title="Loans" description={`${result.total} loan${result.total === 1 ? '' : 's'}`} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                <th className="px-5 py-3">Loan</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Product</th>
                <th className="px-5 py-3">Principal</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gold-100">
              {result.items.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/loans/${loan.id}`} className="font-medium text-ink hover:text-gold-700">
                      {loan.loanNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">
                    {loan.customer ? `${loan.customer.firstName} ${loan.customer.lastName ?? ''}` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-ink-light">{loan.product?.name ?? '—'}</td>
                  <td className="px-5 py-3.5 text-ink-light">₹{Number(loan.principalAmount).toLocaleString('en-IN')}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={loan.status} /></td>
                  <td className="px-5 py-3.5 text-ink-light">{loan.startDate ? formatDate(loan.startDate) : '—'}</td>
                </tr>
              ))}
              {result.items.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-ink-light/60">No loans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
