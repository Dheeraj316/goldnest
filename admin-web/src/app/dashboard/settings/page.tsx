import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { apiFetch } from '@/lib/api-server';
import { getCurrentUser, hasPermission } from '@/lib/auth';
import type { ConfigurationVersion, Setting } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { NewSettingChangeForm } from './NewSettingChangeForm';
import { PendingChangeRow } from './PendingChangeRow';

export const metadata: Metadata = { title: 'Configuration' };

export default async function SettingsPage() {
  const [user, settings, pendingChanges] = await Promise.all([
    getCurrentUser(),
    apiFetch<Setting[]>('/settings'),
    apiFetch<ConfigurationVersion[]>('/settings/pending-changes'),
  ]);

  const canManage = hasPermission(user, 'setting.manage');
  const canApprove = hasPermission(user, 'setting.approve');

  return (
    <div>
      <PageHeader
        title="Configuration"
        description="Every regulatory and commercial parameter — LTV, rates, fees, limits — lives here, never hard-coded. Changes require a second, different authorized approver."
        action={canManage ? <NewSettingChangeForm /> : undefined}
      />

      {pendingChanges.length > 0 && (
        <div className="card mb-8 p-6">
          <h2 className="font-display text-lg font-semibold text-ink">Pending approvals ({pendingChanges.length})</h2>
          <div className="mt-4 space-y-3">
            {pendingChanges.map((change) => (
              <PendingChangeRow key={change.id} change={change} isOwnRequest={change.requestedBy === user?.userId} canApprove={canApprove} />
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
              <th className="px-5 py-3">Key</th>
              <th className="px-5 py-3">Scope</th>
              <th className="px-5 py-3">Value</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {settings.map((setting) => (
              <tr key={setting.id}>
                <td className="px-5 py-3.5">
                  <p className="font-medium text-ink">{setting.key}</p>
                  {setting.description && <p className="text-xs text-ink-light/60">{setting.description}</p>}
                </td>
                <td className="px-5 py-3.5 text-ink-light">{setting.scope}</td>
                <td className="px-5 py-3.5 font-mono text-ink">
                  {setting.status === 'PENDING_APPROVAL' ? (
                    <span className="text-ink-light/40">not yet active</span>
                  ) : (
                    JSON.stringify(setting.value)
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={setting.status} />
                </td>
                <td className="px-5 py-3.5 text-ink-light">{formatDate(setting.updatedAt)}</td>
              </tr>
            ))}
            {settings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-light/60">
                  No configuration values set yet.
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
