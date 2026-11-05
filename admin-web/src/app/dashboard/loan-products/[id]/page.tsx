import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import type { LoanProduct } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { NewInterestRuleForm } from './NewInterestRuleForm';
import { NewChargeForm } from './NewChargeForm';

export const metadata: Metadata = { title: 'Loan Product' };

export default async function LoanProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await apiFetch<LoanProduct>(`/loan-products/${id}`);
  const currentRule = product.interestRules?.find((r) => !r.effectiveTo);

  return (
    <div>
      <Link href="/dashboard/loan-products" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700">
        <ArrowLeft size={14} /> Back to products
      </Link>
      <PageHeader title={product.name} description={product.code} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Product terms</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-light">Max LTV</dt><dd className="font-medium text-ink">{product.maxLtvPercent}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Amount range</dt><dd className="font-medium text-ink">₹{Number(product.minLoanAmount).toLocaleString('en-IN')} – ₹{Number(product.maxLoanAmount).toLocaleString('en-IN')}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Tenure range</dt><dd className="font-medium text-ink">{product.minTenureDays}–{product.maxTenureDays} days</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Grace period</dt><dd className="font-medium text-ink">{product.gracePeriodDays} days</dd></div>
            <div className="flex justify-between"><dt className="text-ink-light">Status</dt><dd><StatusBadge status={product.isActive ? 'ACTIVE' : 'INACTIVE'} /></dd></div>
          </dl>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Interest rule</h2>
            <NewInterestRuleForm productId={product.id} />
          </div>
          {currentRule ? (
            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-light">Method</dt><dd className="font-medium text-ink">{currentRule.method.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-light">Annual rate</dt><dd className="font-medium text-ink">{currentRule.annualRatePercent}%</dd></div>
              <div className="flex justify-between"><dt className="text-ink-light">Penal rate</dt><dd className="font-medium text-ink">{currentRule.penalRatePercent}%</dd></div>
              <div className="flex justify-between"><dt className="text-ink-light">Accrual / payment</dt><dd className="font-medium text-ink">{currentRule.accrualFrequency} / {currentRule.paymentFrequency}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-light">Effective from</dt><dd className="font-medium text-ink">{formatDate(currentRule.effectiveFrom)}</dd></div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-ink-light/60">No active interest rule.</p>
          )}
        </div>

        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Charges</h2>
            <NewChargeForm productId={product.id} />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gold-100 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gold-100">
                {(product.charges ?? []).map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-4 font-medium text-ink">{c.code}</td>
                    <td className="py-2.5 pr-4 text-ink-light">{c.name}</td>
                    <td className="py-2.5 pr-4 text-ink-light">{c.calcType === 'FLAT' ? 'Flat' : '% of principal'}</td>
                    <td className="py-2.5 pr-4 font-medium text-ink">{c.calcType === 'FLAT' ? `₹${c.amount}` : `${c.amount}%`}</td>
                  </tr>
                ))}
                {(product.charges ?? []).length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-ink-light/60">No charges configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
