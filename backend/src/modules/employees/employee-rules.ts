// Who may create, change or take over an employee account — the parts that protect Super Admin.
// Pure functions (no I/O) so the rules are easy to test; the service turns a message into a 403.

export const SUPER_ADMIN_ROLE_CODE = 'SUPER_ADMIN';

const isSuperAdmin = (roleCode: string | undefined) => roleCode === SUPER_ADMIN_ROLE_CODE;

/**
 * Only a Super Admin may change or take over a Super Admin's account. Without this, anyone who can manage
 * employees could reset a Super Admin's password (and sign in as them), deactivate them, or move them.
 */
export function superAdminAccountViolation(actorRoleCode: string | undefined, targetRoleCode: string): string | null {
  if (isSuperAdmin(targetRoleCode) && !isSuperAdmin(actorRoleCode)) {
    return "Only a Super Admin can change a Super Admin's account.";
  }
  return null;
}

/**
 * Rules for giving an employee a role: nobody may make someone else a Super Admin unless they are one, and
 * nobody may change their own role (that would be a way to promote yourself).
 */
export function roleAssignmentViolation(input: { actorRoleCode: string | undefined; newRoleCode: string; isSelf: boolean; isChange: boolean }): string | null {
  if (isSuperAdmin(input.newRoleCode) && !isSuperAdmin(input.actorRoleCode)) {
    return 'Only a Super Admin can give someone the Super Admin role.';
  }
  if (input.isSelf && input.isChange) {
    return 'You cannot change your own role.';
  }
  return null;
}
