import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Grid3x3 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { NewRoleForm } from './NewRoleForm';

export const metadata: Metadata = { title: 'Roles & Permissions' };

export default async function RolesPage() {
  const [user, roles] = await Promise.all([getCurrentUser(), apiFetch<Role[]>('/roles')]);
  const canManage = hasPermission(user, 'role.manage');

  return (
    <div>
      <PageHeader
        title="Roles & Permissions"
        description={`${roles.length} role${roles.length === 1 ? '' : 's'} defined`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/roles/matrix" className="btn-secondary whitespace-nowrap">
              <Grid3x3 size={15} /> Access matrix
            </Link>
            {canManage && <NewRoleForm />}
          </div>
        }
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Link
            key={role.id}
            href={`/dashboard/roles/${role.id}`}
            className="card group p-5 transition hover:border-gold-300"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-gold-300">
                <ShieldCheck size={18} />
              </div>
              {role.isSystem && <span className="badge bg-gray-100 text-gray-600">System</span>}
            </div>
            <h3 className="mt-3 font-display text-lg font-semibold text-ink">{role.name}</h3>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold-600">{role.code}</p>
            {role.description && <p className="mt-2 text-sm text-ink-light">{role.description}</p>}
            <div className="mt-4 flex items-center justify-between border-t border-gold-100 pt-3 text-xs text-ink-light/60">
              <span>
                {role.permissions?.length || 0} permission{(role.permissions?.length || 0) === 1 ? '' : 's'} on · {role._count?.employees ?? 0} staff
              </span>
              <ArrowRight size={14} className="text-gold-500 opacity-0 transition group-hover:opacity-100" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
