import { AccessChangeInput, AccessRuleError, diffToChange, planAccessChange } from './access-rules';

const known = new Set(['loan.view', 'loan.approve', 'payment.create', 'payment.view', 'role.manage', 'report.view']);

const base = (over: Partial<AccessChangeInput> = {}): AccessChangeInput => ({
  roleCode: 'CASHIER',
  roleName: 'Cashier',
  currentCodes: new Set(['loan.view', 'payment.create']),
  grant: [],
  revoke: [],
  knownCodes: known,
  actorRoleCode: 'SUPER_ADMIN',
  actorCodes: new Set(known),
  ...over,
});

const ruleOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof AccessRuleError ? e.rule : `other:${String(e)}`;
  }
  return 'none';
};

describe('planAccessChange', () => {
  it('works out what really changes, ignoring no-ops', () => {
    const plan = planAccessChange(base({ grant: ['payment.view', 'loan.view'], revoke: ['payment.create', 'report.view'] }));
    expect(plan.granted).toEqual(['payment.view']); // loan.view was already held
    expect(plan.revoked).toEqual(['payment.create']); // report.view was not held
  });

  it('allows an empty change', () => {
    expect(planAccessChange(base())).toEqual({ granted: [], revoked: [] });
  });

  it('never lets Super Admin be edited, whoever asks', () => {
    expect(ruleOf(() => planAccessChange(base({ roleCode: 'SUPER_ADMIN', roleName: 'Super Admin', revoke: ['loan.view'] })))).toBe('ROLE_LOCKED');
    expect(ruleOf(() => planAccessChange(base({ roleCode: 'SUPER_ADMIN', roleName: 'Super Admin', actorRoleCode: 'ADMIN' })))).toBe('ROLE_LOCKED');
  });

  it("blocks changing your own role's access", () => {
    expect(ruleOf(() => planAccessChange(base({ actorRoleCode: 'CASHIER', revoke: ['loan.view'] })))).toBe('OWN_ROLE');
  });

  it('blocks granting access the person making the change does not hold', () => {
    const actorCodes = new Set(['role.manage', 'loan.view']);
    expect(ruleOf(() => planAccessChange(base({ actorRoleCode: 'ADMIN', actorCodes, grant: ['loan.approve'] })))).toBe('ABOVE_YOUR_ACCESS');
    // granting something they do hold is fine
    expect(planAccessChange(base({ actorRoleCode: 'ADMIN', actorCodes, grant: ['loan.view'] })).granted).toEqual([]);
  });

  it('lets someone revoke access they do not hold themselves', () => {
    const actorCodes = new Set(['role.manage']);
    expect(planAccessChange(base({ actorRoleCode: 'ADMIN', actorCodes, revoke: ['payment.create'] })).revoked).toEqual(['payment.create']);
  });

  it('never lets role management be switched on for any role but Super Admin', () => {
    // even a Super Admin cannot delegate it
    expect(ruleOf(() => planAccessChange(base({ roleCode: 'ADMIN', roleName: 'Admin', grant: ['role.manage'] })))).toBe('RESERVED');
    // ...but it can be switched off a role that somehow holds it
    const plan = planAccessChange(base({ roleCode: 'ADMIN', roleName: 'Admin', currentCodes: new Set(['role.manage', 'loan.view']), revoke: ['role.manage'] }));
    expect(plan.revoked).toEqual(['role.manage']);
    // a no-op re-grant of something already held is not treated as a new grant
    expect(planAccessChange(base({ roleCode: 'ADMIN', roleName: 'Admin', currentCodes: new Set(['role.manage']), grant: ['role.manage'] })).granted).toEqual([]);
  });

  it('rejects unknown permission codes instead of silently ignoring them', () => {
    expect(ruleOf(() => planAccessChange(base({ grant: ['loan.teleport'] })))).toBe('UNKNOWN_PERMISSION');
    expect(ruleOf(() => planAccessChange(base({ revoke: ['nope.nope'] })))).toBe('UNKNOWN_PERMISSION');
  });

  it('rejects a permission that is both granted and revoked', () => {
    expect(ruleOf(() => planAccessChange(base({ grant: ['report.view'], revoke: ['report.view'] })))).toBe('CONFLICT');
  });

  it('treats duplicate codes as one', () => {
    expect(planAccessChange(base({ grant: ['report.view', 'report.view'] })).granted).toEqual(['report.view']);
  });
});

describe('diffToChange', () => {
  it('turns a desired full set into grant/revoke against the current one', () => {
    const c = diffToChange(new Set(['a', 'b']), ['b', 'c']);
    expect(c).toEqual({ grant: ['c'], revoke: ['a'] });
  });
});
