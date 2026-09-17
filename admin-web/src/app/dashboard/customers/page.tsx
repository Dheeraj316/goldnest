import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import type { Customer, Paginated } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { SearchBar } from './SearchBar';

export const metadata: Metadata = { title: 'Customers' };

function buildQuery(q?: string): string {
  const params = new URLSearchParams({ pageSize: '25' });
  if (q) {
    if (/^[6-9]\d{9}$/.test(q)) params.set('mobile', q);
    else if (/^CUS-/i.test(q)) params.set('customerCode', q);
    else params.set('name', q);
  }
  return params.toString();
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const result = await apiFetch<Paginated<Customer>>(`/customers?${buildQuery(q)}`);

  return (
    <div>
      <PageHeader title="Customers" description={`${result.total} customer${result.total === 1 ? '' : 's'}`} />

      <div className="mb-6">
        <SearchBar />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Mobile</th>
              <th className="px-5 py-3">KYC status</th>
              <th className="px-5 py-3">Account status</th>
              <th className="px-5 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {result.items.map((customer) => (
              <tr key={customer.id}>
                <td className="px-5 py-3.5">
                  <Link href={`/dashboard/customers/${customer.id}`} className="font-medium text-ink hover:text-gold-700">
                    {customer.firstName} {customer.lastName}
                  </Link>
                  <p className="text-xs text-ink-light/60">{customer.customerCode}</p>
                </td>
                <td className="px-5 py-3.5 text-ink-light">{customer.mobile}</td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={customer.kycStatus} />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={customer.status} />
                </td>
                <td className="px-5 py-3.5 text-ink-light">{formatDate(customer.createdAt)}</td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                  No customers found.
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
