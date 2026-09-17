import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Customer } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { KycRecordCard } from './KycRecordCard';

export const metadata: Metadata = { title: 'Customer detail' };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, customer] = await Promise.all([getCurrentUser(), apiFetch<Customer>(`/customers/${id}`)]);
  const canReview = hasPermission(user, 'customer.kyc.verify');
  const primaryAddress = customer.addresses?.find((a) => a.isPrimary) ?? customer.addresses?.[0];

  return (
    <div>
      <Link href="/dashboard/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink">
        <ArrowLeft size={15} /> Back to customers
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-sm text-ink-light/60">{customer.customerCode}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={customer.kycStatus} />
          <StatusBadge status={customer.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-ink">Profile</h2>
          <div className="mt-4 space-y-3 text-sm">
            <p className="flex items-center gap-2 text-ink-light">
              <Phone size={14} className="text-gold-500" /> {customer.mobile}
            </p>
            {customer.email && (
              <p className="flex items-center gap-2 text-ink-light">
                <Mail size={14} className="text-gold-500" /> {customer.email}
              </p>
            )}
            {primaryAddress && (
              <p className="flex items-start gap-2 text-ink-light">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gold-500" />
                {primaryAddress.line1}, {primaryAddress.city}, {primaryAddress.state} {primaryAddress.pinCode}
              </p>
            )}
            <p className="flex items-center gap-2 text-ink-light">
              <Calendar size={14} className="text-gold-500" /> Joined {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-display text-base font-semibold text-ink">KYC documents</h2>
          {!customer.kycRecords || customer.kycRecords.length === 0 ? (
            <p className="mt-4 text-sm text-ink-light/60">No KYC documents submitted yet.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {customer.kycRecords.map((record) => (
                <KycRecordCard key={record.id} record={record} customerId={customer.id} canReview={canReview} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
