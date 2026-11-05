import type { Permission } from './types';

// Presentation helpers for the Roles & Permissions screens. Nothing here decides who may do what — the
// backend does, on every request. These only make the catalogue readable and help an admin see, before
// saving, exactly what they are about to switch on or off.

const MODULE_LABELS: Record<string, string> = {
  branch: 'Branches',
  employee: 'Employees',
  customer: 'Customers & KYC',
  role: 'Roles & permissions',
  setting: 'Configuration',
  audit_log: 'Audit logs',
  loan_product: 'Loan products',
  loan_application: 'Loan applications',
  appraisal: 'Gold appraisal',
  loan: 'Loans',
  payment: 'Payments & receipts',
  collection: 'Collections',
  enquiry: 'Website enquiries',
  report: 'Reports',
};

const MODULE_ORDER = Object.keys(MODULE_LABELS);

// Permissions that move money, release gold, approve on someone's behalf or change who can do what.
// Shown with a "Sensitive" tag so an admin pauses before switching them on.
const SENSITIVE = new Set([
  'role.manage', 'employee.manage', 'branch.manage', 'setting.manage', 'setting.approve',
  'loan_product.manage', 'customer.kyc.verify', 'appraisal.approve',
  'loan.approve', 'loan.disburse', 'loan.close', 'loan.renew', 'loan.topup', 'loan.partrelease',
  'payment.create', 'collection.assign',
]);

export const isSensitive = (code: string) => SENSITIVE.has(code);

// Only Super Admin may hold these; the backend refuses to switch them on for any other role. Mirrors
// RESERVED_CODES in the API (the API is what enforces it — this only explains it on screen).
const RESERVED = new Set(['role.manage']);
export const isReserved = (code: string) => RESERVED.has(code);
export const RESERVED_NOTE = 'Reserved for Super Admin — it cannot be switched on for other roles.';

export function moduleLabel(resource: string): string {
  return MODULE_LABELS[resource] ?? resource.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export interface PermissionGroup {
  resource: string;
  label: string;
  permissions: Permission[];
}

/** Groups the catalogue by module, in a sensible order (unknown modules last). */
export function groupPermissions(all: Permission[]): PermissionGroup[] {
  const map = new Map<string, Permission[]>();
  for (const p of all) map.set(p.resource, [...(map.get(p.resource) ?? []), p]);
  const rank = (r: string) => {
    const i = MODULE_ORDER.indexOf(r);
    return i === -1 ? MODULE_ORDER.length : i;
  };
  return Array.from(map.entries())
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([resource, permissions]) => ({ resource, label: moduleLabel(resource), permissions }));
}

export interface AccessDiff {
  granted: string[];
  revoked: string[];
}

export function diffSets(before: ReadonlySet<string>, after: ReadonlySet<string>): AccessDiff {
  return {
    granted: Array.from(after).filter((c) => !before.has(c)).sort(),
    revoked: Array.from(before).filter((c) => !after.has(c)).sort(),
  };
}

/** Why a role's access cannot be edited by this person, or null when it can. */
export function lockReason(roleCode: string, actorRoleCode: string | undefined, canManage: boolean): string | null {
  if (!canManage) return 'You can view access here but not change it.';
  if (roleCode === 'SUPER_ADMIN') return 'Super Admin always has full access and cannot be changed.';
  if (actorRoleCode && actorRoleCode === roleCode) return "This is your own role — you can't change your own access. Ask a Super Admin.";
  return null;
}
