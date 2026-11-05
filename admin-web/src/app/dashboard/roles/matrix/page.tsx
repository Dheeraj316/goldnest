import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { lockReason } from '@/lib/access';
import type { Permission, Role } from '@/lib/types';
import { AccessMatrix, type MatrixRole } from './AccessMatrix';

export const metadata: Metadata = { title: 'Access matrix' };

export default async function AccessMatrixPage() {
  const [user, roles, permissions] = await Promise.all([getCurrentUser(), apiFetch<Role[]>('/roles'), apiFetch<Permission[]>('/permissions')]);
  const canManage = hasPermission(user, 'role.manage');

  // Widest access first, so the most powerful roles read left to right.
  const columns: MatrixRole[] = roles
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      employeeCount: r._count?.employees ?? 0,
      codes: (r.permissions ?? []).map((rp) => rp.permission.code),
      lockedReason: lockReason(r.code, user?.roleCode, canManage),
    }))
    .sort((a, b) => b.codes.length - a.codes.length || a.name.localeCompare(b.name));

  return (
    <div>
      <Link href="/dashboard/roles" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink">
        <ArrowLeft size={15} /> Back to roles
      </Link>
      <PageHeader
        title="Access matrix"
        description={canManage ? 'Every role side by side. Switch access on or off, then review and save — nothing is preset, and changes apply immediately.' : 'Every role side by side (view only).'}
      />
      <AccessMatrix roles={columns} permissions={permissions} actorCodes={user?.permissions ?? []} />
    </div>
  );
}
