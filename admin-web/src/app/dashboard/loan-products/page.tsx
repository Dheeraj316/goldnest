import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import type { LoanProduct } from '@/lib/types';
import { NewLoanProductForm } from './NewLoanProductForm';

export const metadata: Metadata = { title: 'Loan Products' };

export default async function LoanProductsPage() {
  const products = await apiFetch<LoanProduct[]>('/loan-products');

  return (
    <div>
      <PageHeader
        title="Loan Products"
        description={`${products.length} product${products.length === 1 ? '' : 's'} configured`}
        action={<NewLoanProductForm />}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link key={p.id} href={`/dashboard/loan-products/${p.id}`} className="card group p-5 transition hover:border-gold-300">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-semibold text-ink">{p.name}</h3>
              <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
            </div>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-gold-600">{p.code}</p>
            <dl className="mt-4 space-y-1.5 text-sm text-ink-light">
              <div className="flex justify-between">
                <dt>Max LTV</dt>
                <dd className="font-medium text-ink">{p.maxLtvPercent}%</dd>
              </div>
              <div className="flex justify-between">
                <dt>Amount range</dt>
                <dd className="font-medium text-ink">₹{Number(p.minLoanAmount).toLocaleString('en-IN')} – ₹{Number(p.maxLoanAmount).toLocaleString('en-IN')}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Tenure</dt>
                <dd className="font-medium text-ink">{p.minTenureDays}–{p.maxTenureDays} days</dd>
              </div>
            </dl>
          </Link>
        ))}
        {products.length === 0 && <p className="text-sm text-ink-light/60">No loan products configured yet.</p>}
      </div>
    </div>
  );
}
