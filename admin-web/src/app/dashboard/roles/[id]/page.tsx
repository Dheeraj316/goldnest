import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { Permission, Role } from '@/lib/types';
import { PermissionEditor } from './PermissionEditor';

export const metadata: Metadata = { title: 'Role detail' };

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
  const initialCodes = (role.permissions || []).map((rp) => rp.permission.code);

  return (
    <div>
      <Link href="/dashboard/roles" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-light hover:text-ink">
        <ArrowLeft size={15} /> Back to roles
      </Link>

      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink">{role.name}</h1>
        <p className="text-sm text-ink-light/60">{role.code}</p>
        {role.description && <p className="mt-2 max-w-xl text-sm text-ink-light">{role.description}</p>}
      </div>

      <div className="card p-6">
        <PermissionEditor roleId={role.id} allPermissions={permissions} initialCodes={initialCodes} readOnly={!canManage} />
      </div>
    </div>
  );
}
