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
