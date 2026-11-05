// The rules for changing which permissions a role holds. Kept free of I/O so they can be
// tested exhaustively — this is the one place that decides whether an access change is allowed.

/** Roles whose access can never be edited. Super Admin is the break-glass role: it always holds everything. */
export const LOCKED_ROLE_CODES: readonly string[] = ['SUPER_ADMIN'];

/**
 * Permissions that only a locked role (Super Admin) may hold. Deciding who can do what is Super Admin's job alone,
 * so the right to change access can never be switched on for any other role.
 */
export const RESERVED_CODES: readonly string[] = ['role.manage'];

export type AccessRuleCode = 'ROLE_LOCKED' | 'OWN_ROLE' | 'CONFLICT' | 'UNKNOWN_PERMISSION' | 'RESERVED' | 'ABOVE_YOUR_ACCESS';

export class AccessRuleError extends Error {
  constructor(
    readonly rule: AccessRuleCode,
    message: string,
  ) {
    super(message);
  }
}

export interface AccessChangeInput {
  roleCode: string;
  roleName: string;
  /** Codes the role holds right now. */
  currentCodes: ReadonlySet<string>;
  grant: readonly string[];
  revoke: readonly string[];
  /** Every permission code that exists. */
  knownCodes: ReadonlySet<string>;
  actorRoleCode: string | undefined;
  /** What the person making the change holds themselves (live, not from an old token). */
  actorCodes: ReadonlySet<string>;
}

export interface AccessChangePlan {
  granted: string[];
  revoked: string[];
}

const unique = (codes: readonly string[]) => Array.from(new Set(codes));

/**
 * Validates a requested change to one role and works out what actually changes.
 * Granting something the role already has, or revoking something it doesn't, is a harmless no-op.
 */
export function planAccessChange(input: AccessChangeInput): AccessChangePlan {
  const { roleCode, roleName, currentCodes, knownCodes, actorRoleCode, actorCodes } = input;

  if (LOCKED_ROLE_CODES.includes(roleCode)) {
    throw new AccessRuleError('ROLE_LOCKED', `${roleName} always has full access, so its permissions cannot be changed.`);
  }
  if (actorRoleCode && actorRoleCode === roleCode) {
    throw new AccessRuleError('OWN_ROLE', `You cannot change your own role's access. Ask a Super Admin to change ${roleName}.`);
  }

  const grant = unique(input.grant);
  const revoke = unique(input.revoke);

  const both = grant.filter((c) => revoke.includes(c));
  if (both.length > 0) {
    throw new AccessRuleError('CONFLICT', `A permission cannot be both granted and revoked in the same change: ${both.join(', ')}.`);
  }
  const unknown = [...grant, ...revoke].filter((c) => !knownCodes.has(c));
  if (unknown.length > 0) {
    throw new AccessRuleError('UNKNOWN_PERMISSION', `Unknown permission${unknown.length === 1 ? '' : 's'}: ${unknown.join(', ')}.`);
  }

  const granted = grant.filter((c) => !currentCodes.has(c));
  const revoked = revoke.filter((c) => currentCodes.has(c));

  // Reaching this point means the role is not locked, so no reserved permission may be switched on for it.
  // (Switching one OFF — say, if an older setup left it on a role — is always allowed.)
  const reserved = granted.filter((c) => RESERVED_CODES.includes(c));
  if (reserved.length > 0) {
    throw new AccessRuleError('RESERVED', `Managing roles and access is reserved for Super Admin, so it cannot be switched on for ${roleName}.`);
  }

  // Nobody can hand out access they do not hold themselves — otherwise anyone able to edit roles could
  // escalate every role (and so, indirectly, themselves) above their own level.
  const beyond = granted.filter((c) => !actorCodes.has(c));
  if (beyond.length > 0) {
    throw new AccessRuleError('ABOVE_YOUR_ACCESS', `You can only grant access you hold yourself. Not permitted: ${beyond.join(', ')}.`);
  }

  return { granted, revoked };
}

/** Turns "the full set this role should have" into the equivalent grant/revoke change. */
export function diffToChange(currentCodes: ReadonlySet<string>, desiredCodes: readonly string[]): { grant: string[]; revoke: string[] } {
  const desired = new Set(desiredCodes);
  return {
    grant: Array.from(desired).filter((c) => !currentCodes.has(c)),
    revoke: Array.from(currentCodes).filter((c) => !desired.has(c)),
  };
}
