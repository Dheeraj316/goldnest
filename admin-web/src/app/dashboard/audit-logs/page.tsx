import type { Metadata } from 'next';
import { PageHeader } from '@/components/PageHeader';
import { apiFetch } from '@/lib/api-server';
import type { AuditLog, Paginated } from '@/lib/types';
import { formatDateTime } from '@/lib/format';

export const metadata: Metadata = { title: 'Audit Logs' };

export default async function AuditLogsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page } = await searchParams;
  const currentPage = Number(page) || 1;
  const result = await apiFetch<Paginated<AuditLog>>(`/audit-logs?page=${currentPage}&pageSize=25`);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div>
      <PageHeader title="Audit Logs" description="Every sensitive action, recorded and immutable — there is no edit or delete path for this data, anywhere in the system." />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gold-100 bg-gold-50/40 text-left text-xs font-semibold uppercase tracking-wide text-ink-light/70">
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Reference</th>
              <th className="px-5 py-3">IP</th>
              <th className="px-5 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gold-100">
            {result.items.map((log) => (
              <tr key={log.id}>
                <td className="px-5 py-3.5 font-mono text-xs font-medium text-ink">{log.action}</td>
                <td className="px-5 py-3.5 text-ink-light">
                  {log.referenceType ? (
                    <span>
                      {log.referenceType} <span className="text-ink-light/50">#{log.referenceId?.slice(0, 8)}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-5 py-3.5 text-ink-light">{log.ip || '—'}</td>
                <td className="px-5 py-3.5 text-ink-light">{formatDateTime(log.createdAt)}</td>
              </tr>
            ))}
            {result.items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-ink-light/60">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-light">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            {currentPage > 1 && (
              <a href={`/dashboard/audit-logs?page=${currentPage - 1}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                Previous
              </a>
            )}
            {currentPage < totalPages && (
              <a href={`/dashboard/audit-logs?page=${currentPage + 1}`} className="btn-secondary !px-3 !py-1.5 text-xs">
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
