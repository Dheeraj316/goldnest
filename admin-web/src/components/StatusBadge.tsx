const TONES: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  INACTIVE: 'bg-gray-100 text-gray-600',
  SUSPENDED: 'bg-rose-50 text-rose-600',
  REJECTED: 'bg-rose-50 text-rose-600',
  PENDING: 'bg-gold-50 text-gold-700',
  PENDING_APPROVAL: 'bg-gold-50 text-gold-700',
  IN_REVIEW: 'bg-gold-50 text-gold-700',
  EXPIRED: 'bg-gray-100 text-gray-600',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] || 'bg-gray-100 text-gray-600';
  return <span className={`badge ${tone}`}>{status.replace(/_/g, ' ')}</span>;
}
