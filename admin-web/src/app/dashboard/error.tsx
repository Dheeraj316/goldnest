'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ApiError } from '@/lib/api-error';

// Catches errors thrown while rendering anything under /dashboard (most
// commonly a permission-denied ApiError from apiFetch) so a single blocked
// request shows an in-app alert instead of crashing to Next's dev overlay.
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const isPermission = error instanceof ApiError ? error.status === 403 : /permission/i.test(error.message);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50">
          <AlertTriangle className="text-rose-600" size={22} />
        </div>
        <h2 className="mt-4 font-display text-lg font-semibold text-ink">
          {isPermission ? "You don't have permission to view this" : 'Something went wrong'}
        </h2>
        <p className="mt-2 text-sm text-ink-light">
          {isPermission
            ? "Your account doesn't carry the permission this page needs. If you believe this is wrong, ask an admin to check your role, or sign out and back in if your access was just changed."
            : error.message || 'An unexpected error occurred while loading this page.'}
        </p>
        <button onClick={reset} className="btn-secondary mt-5">
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    </div>
  );
}
