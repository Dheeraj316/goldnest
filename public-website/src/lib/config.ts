// Cross-app links. The admin console is a separate Next.js app (see
// ../../admin-web); in production this becomes something like
// https://staff.goldnest.in — set NEXT_PUBLIC_ADMIN_URL to override.
export const ADMIN_WEB_URL = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3002';

export const COMPANY = {
  brandName: 'Goldnest',
  legalName: 'Goldnest Financial Services Private Limited (proposed)',
  supportEmail: 'support@goldnest.in',
  supportPhone: '1800-000-0000',
  grievanceEmail: 'grievance@goldnest.in',
};
