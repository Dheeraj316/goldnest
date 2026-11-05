// Explicit locale + timeZone everywhere a date is rendered. Two reasons:
// 1. Business consistency — Goldnest operates in India; every viewer should
//    see the same wall-clock time regardless of their own machine's timezone.
// 2. Correctness — a bare `.toLocaleString()` resolves the *runtime's*
//    default locale/timezone, which differs between the Node.js server
//    process and a viewer's browser. In a Client Component that runs once
//    during SSR and once during hydration, that mismatch is exactly what
//    triggered a real "Hydration failed" error during testing (see
//    PendingChangeRow) — pinning both explicitly makes the two renders
//    produce identical text.
const TIME_ZONE = 'Asia/Kolkata';
const LOCALE = 'en-IN';

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString(LOCALE, { timeZone: TIME_ZONE });
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, { timeZone: TIME_ZONE });
}

export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString(LOCALE, { timeZone: TIME_ZONE });
}

/** Indian-grouped rupee amount with two decimals, e.g. 1216597.19 -> ₹12,16,597.19. Accepts the backend's money strings. */
export function formatMoney(value: string | number): string {
  return `₹${Number(value).toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact rupee amount for tight spaces, e.g. 1216597 -> ₹12.17 L, 25000000 -> ₹2.50 Cr. */
export function formatMoneyCompact(value: string | number): string {
  const n = Number(value);
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`;
}
