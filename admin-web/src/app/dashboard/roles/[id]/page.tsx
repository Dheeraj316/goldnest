import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Grid3x3 } from 'lucide-react';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import { lockReason } from '@/lib/access';
import type { Permission, Role } from '@/lib/types';
import { AccessEditor } from './AccessEditor';

export const metadata: Metadata = { title: 'Role access' };

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [user, roles, permissions] = await Promise.all([
    getCurrentUser(),
    apiFetch<Role[]>('/roles'),
    apiFetch<Permission[]>('/permissions'),
  ]);

  const role = roles.find((r) => r.id === id);
  if (!role) notFound();

  const canManage = hasPermission(user, 'role.manage');
  const initialCodes = (role.permissions || []).map((rp) => rp.permission.code).sort();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/roles" className="inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink">
          <ArrowLeft size={15} /> Back to roles
        </Link>
        <Link href="/dashboard/roles/matrix" className="inline-flex items-center gap-1.5 text-sm font-medium text-gold-600 hover:text-gold-700">
          <Grid3x3 size={14} /> Compare all roles
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">{role.name}</h1>
        <p className="text-sm text-ink-light/60">
          {role.code} · {role._count?.employees ?? 0} employee{(role._count?.employees ?? 0) === 1 ? '' : 's'}
        </p>
        {role.description && <p className="mt-2 max-w-xl text-sm text-ink-light">{role.description}</p>}
        <p className="mt-3 max-w-2xl text-sm text-ink-light">
          Switch access on or off for this role. Nothing is preset — what you set here is what {role.name} employees can do, and it applies the moment you save.
        </p>
      </div>

      <div className="card p-6">
        <AccessEditor
          roleId={role.id}
          roleName={role.name}
          employeeCount={role._count?.employees ?? 0}
          permissions={permissions}
          initialCodes={initialCodes}
          actorCodes={user?.permissions ?? []}
          lockedReason={lockReason(role.code, user?.roleCode, canManage)}
        />
      </div>
    </div>
  );
}
