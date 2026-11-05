'use client';

// Appears once there is something unsaved. Sticky so it is always within reach however far down the
// permission list the admin has scrolled.
export function SaveBar({ enabled, disabled, onDiscard, onReview }: { enabled: number; disabled: number; onDiscard: () => void; onReview: () => void }) {
  const total = enabled + disabled;
  if (total === 0) return null;
  return (
    <div className="sticky bottom-4 z-30 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold-300 bg-white px-5 py-3 shadow-elevated" role="status">
      <p className="text-sm text-ink">
        <strong>{total}</strong> unsaved change{total === 1 ? '' : 's'}
        <span className="ml-2 text-emerald-700">+{enabled} on</span>
        <span className="ml-2 text-rose-700">−{disabled} off</span>
      </p>
      <div className="flex gap-2">
        <button onClick={onDiscard} className="btn-secondary text-xs">
          Discard
        </button>
        <button onClick={onReview} className="btn-primary text-xs">
          Review &amp; save
        </button>
      </div>
    </div>
  );
}
