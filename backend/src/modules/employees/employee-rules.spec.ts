import { roleAssignmentViolation, superAdminAccountViolation } from './employee-rules';

describe('superAdminAccountViolation', () => {
  it('stops anyone but a Super Admin managing a Super Admin account', () => {
    expect(superAdminAccountViolation('ADMIN', 'SUPER_ADMIN')).toMatch(/Only a Super Admin/);
    expect(superAdminAccountViolation('BRANCH_MANAGER', 'SUPER_ADMIN')).toMatch(/Only a Super Admin/);
    expect(superAdminAccountViolation(undefined, 'SUPER_ADMIN')).toMatch(/Only a Super Admin/);
  });
  it('lets a Super Admin manage any account, and anyone manage a non-Super-Admin account', () => {
    expect(superAdminAccountViolation('SUPER_ADMIN', 'SUPER_ADMIN')).toBeNull();
    expect(superAdminAccountViolation('SUPER_ADMIN', 'CASHIER')).toBeNull();
    expect(superAdminAccountViolation('ADMIN', 'CASHIER')).toBeNull();
  });
});

describe('roleAssignmentViolation', () => {
  const base = { actorRoleCode: 'ADMIN', newRoleCode: 'CASHIER', isSelf: false, isChange: true };
  it('allows an ordinary role change', () => {
    expect(roleAssignmentViolation(base)).toBeNull();
  });
  it('stops a non-Super-Admin creating or promoting anyone to Super Admin', () => {
    expect(roleAssignmentViolation({ ...base, newRoleCode: 'SUPER_ADMIN' })).toMatch(/Super Admin role/);
    expect(roleAssignmentViolation({ ...base, newRoleCode: 'SUPER_ADMIN', isChange: false })).toMatch(/Super Admin role/);
  });
  it('lets a Super Admin assign Super Admin', () => {
    expect(roleAssignmentViolation({ ...base, actorRoleCode: 'SUPER_ADMIN', newRoleCode: 'SUPER_ADMIN' })).toBeNull();
  });
  it('stops people changing their own role, but not a self-edit that leaves the role alone', () => {
    expect(roleAssignmentViolation({ ...base, isSelf: true })).toMatch(/your own role/);
    expect(roleAssignmentViolation({ ...base, isSelf: true, isChange: false })).toBeNull();
  });
});
