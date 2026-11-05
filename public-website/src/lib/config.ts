// Cross-app links. The admin console is a separate Next.js app (see
// ../../admin-web); in production this becomes something like
// https://staff.goldnest.in — set NEXT_PUBLIC_ADMIN_URL to override.
export const ADMIN_WEB_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';

// The real backend — same API every other app in the platform talks to. Only
// the unauthenticated /public/* routes are reachable from here (see
// backend/src/modules/public), so branch data and enquiries submitted on this
// site land in the same database everyone else works from, not a silo.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const COMPANY = {
  brandName: 'Goldnest',
  legalName: 'Goldnest Financial Services Private Limited (proposed)',
  supportEmail: 'support@goldnest.in',
  supportPhone: '1800-000-0000',
  grievanceEmail: 'grievance@goldnest.in',
};
