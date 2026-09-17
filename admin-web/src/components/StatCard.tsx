import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/60">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-600">
          <Icon size={16} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-semibold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-light/60">{hint}</p>}
    </div>
  );
}
