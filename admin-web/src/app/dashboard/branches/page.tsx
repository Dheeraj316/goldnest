import type { Metadata } from 'next';
import { Building2, Mail, Phone } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Branch } from '@/lib/types';
import { NewBranchForm } from './NewBranchForm';

interface Organization {
  id: string;
  name: string;
}

export const metadata: Metadata = { title: 'Branches' };

export default async function BranchesPage() {
  const user = await getCurrentUser();
  const canManage = hasPermission(user, 'branch.manage');

  const [branches, organizations] = await Promise.all([
    apiFetch<Branch[]>('/branches'),
    canManage ? apiFetch<Organization[]>('/organizations') : Promise.resolve<Organization[]>([]),
  ]);

  return (
    <div>
      <PageHeader
        title="Branches"
        description={`${branches.length} branch${branches.length === 1 ? '' : 'es'} in the network`}
        action={canManage && organizations[0] ? <NewBranchForm organizationId={organizations[0].id} /> : undefined}
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <div key={branch.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
                <Building2 size={18} />
              </div>
              <StatusBadge status={branch.status} />
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-ink">{branch.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{branch.code}</p>
            <p className="mt-2 text-sm text-ink-light">
              {branch.addressLine1}, {branch.city}, {branch.state} {branch.pinCode}
            </p>
            <div className="mt-3 space-y-1.5 text-xs text-ink-light/70">
              {branch.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone size={12} /> {branch.phone}
                </p>
              )}
              {branch.email && (
                <p className="flex items-center gap-1.5">
                  <Mail size={12} /> {branch.email}
                </p>
              )}
            </div>
            <div className="mt-4 border-t border-gold-100 pt-3 text-xs text-ink-light/60">
              Cash limit: ₹{Number(branch.cashLimit).toLocaleString('en-IN')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
