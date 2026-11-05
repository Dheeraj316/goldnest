import type { LucideIcon } from 'lucide-react';

export function StatCard({ label, value, icon: Icon, hint }: { label: string; value: string | number; icon: LucideIcon; hint?: string }) {
  return (
    <div className="card group overflow-hidden p-5 hover:-translate-y-0.5 hover:shadow-elevated-hover transition duration-300 ease-smooth">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-card-sheen opacity-60" />
      <div className="relative flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-light/60">{label}</p>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gold-100 to-gold-50 text-gold-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-transform duration-300 ease-smooth group-hover:scale-110">
          <Icon size={16} />
        </div>
      </div>
      <p className="relative mt-3 font-display text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="relative mt-1 text-xs text-ink-light/60">{hint}</p>}
    </div>
  );
}
