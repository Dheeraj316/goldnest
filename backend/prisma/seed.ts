import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Bootstraps the minimum data needed to log in and operate the platform on a
// fresh database: org/branch, the full role & permission matrix, and exactly
// one SUPER_ADMIN account (spec #77 — "do not use a single admin account" is
// about steady-state ops; this one bootstrap account is how you create the
// rest, and its password must be rotated immediately after first login).
const prisma = new PrismaClient();

const PERMISSIONS: { code: string; resource: string; action: string; description: string }[] = [
  { code: 'branch.view', resource: 'branch', action: 'view', description: 'View branches' },
  { code: 'branch.manage', resource: 'branch', action: 'manage', description: 'Create/update branches' },
  { code: 'employee.view', resource: 'employee', action: 'view', description: 'View employees' },
  { code: 'employee.manage', resource: 'employee', action: 'manage', description: 'Create/update/deactivate employees' },
  { code: 'customer.view', resource: 'customer', action: 'view', description: 'View customer records' },
  { code: 'customer.kyc.verify', resource: 'customer', action: 'kyc.verify', description: 'Approve/reject KYC submissions' },
  { code: 'role.view', resource: 'role', action: 'view', description: 'View roles & permissions' },
  { code: 'role.manage', resource: 'role', action: 'manage', description: 'Create roles / assign permissions' },
  { code: 'setting.view', resource: 'setting', action: 'view', description: 'View configuration values' },
  { code: 'setting.manage', resource: 'setting', action: 'manage', description: 'Request configuration changes' },
  { code: 'setting.approve', resource: 'setting', action: 'approve', description: 'Approve/reject configuration changes (maker-checker)' },
  { code: 'audit_log.view', resource: 'audit_log', action: 'view', description: 'View audit logs' },
];

// SUPER_ADMIN gets everything; others start least-privilege and are meant to
// be extended by an admin via PATCH /roles/:id/permissions as later phases
// (loans, collateral, payments, auctions) add their own permission codes.
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: [
    'branch.view', 'branch.manage', 'employee.view', 'employee.manage',
    'customer.view', 'customer.kyc.verify', 'role.view', 'setting.view',
    'setting.manage', 'audit_log.view',
  ],
  REGIONAL_MANAGER: ['branch.view', 'employee.view', 'customer.view', 'setting.view', 'setting.approve', 'audit_log.view'],
  BRANCH_MANAGER: ['branch.view', 'employee.view', 'customer.view', 'customer.kyc.verify'],
  LOAN_OFFICER: ['customer.view'],
  APPRAISER: ['customer.view'],
  CASHIER: ['customer.view'],
  COLLECTION_OFFICER: ['customer.view'],
  AUDITOR: ['branch.view', 'employee.view', 'customer.view', 'audit_log.view', 'setting.view'],
  CUSTOMER_SUPPORT: ['customer.view'],
  REPORTING_USER: ['branch.view', 'audit_log.view'],
};

const ROLE_NAMES: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  REGIONAL_MANAGER: 'Regional Manager',
  BRANCH_MANAGER: 'Branch Manager',
  LOAN_OFFICER: 'Loan Officer',
  APPRAISER: 'Gold Appraiser',
  CASHIER: 'Cashier',
  COLLECTION_OFFICER: 'Collection Officer',
  AUDITOR: 'Auditor',
  CUSTOMER_SUPPORT: 'Customer Support',
  REPORTING_USER: 'Reporting User',
};

async function main() {
  console.log('Seeding permissions...');
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  console.log('Seeding roles...');
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    await prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name, isSystem: true },
    });
  }

  console.log('Assigning role permissions...');
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const permissions = await prisma.permission.findMany({ where: { code: { in: permissionCodes } } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  console.log('Seeding organization & head office branch...');
  // Found by name rather than a hand-picked id: a hardcoded id like
  // "...-0001" isn't a spec-compliant UUID (wrong version nibble), which
  // class-validator's @IsUUID() correctly rejects the moment this id is
  // round-tripped back from a client as, say, a branch's organizationId.
  // Let Prisma's @default(uuid()) generate a real v4 id instead.
  let org = await prisma.organization.findFirst({ where: { name: 'Goldnest' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Goldnest',
        // Placeholder legal entity name — replace with the actual registered
        // company name once incorporation/NBFC or money-lender licensing is
        // finalized (see the compliance notice in the root README).
        legalName: 'Goldnest Financial Services Private Limited',
      },
    });
  }

  const branch = await prisma.branch.upsert({
    where: { code: 'HO01' },
    update: {},
    create: {
      organizationId: org.id,
      code: 'HO01',
      name: 'Head Office Branch',
      addressLine1: 'Address line 1',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560001',
    },
  });

  console.log('Seeding bootstrap SUPER_ADMIN...');
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const bootstrapPassword = process.env.SEED_SUPER_ADMIN_PASSWORD || 'ChangeMe!12345';
  const bootstrapMobile = process.env.SEED_SUPER_ADMIN_MOBILE || '9999999999';

  const existingAdmin = await prisma.user.findUnique({ where: { mobile: bootstrapMobile } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(bootstrapPassword, 12);
    const user = await prisma.user.create({
      data: { type: 'EMPLOYEE', mobile: bootstrapMobile, email: 'superadmin@example.com', passwordHash },
    });
    const employeeCode = `EMP-${branch.code}-000001`;
    await prisma.employee.create({
      data: {
        userId: user.id,
        employeeCode,
        branchId: branch.id,
        roleId: superAdminRole.id,
        firstName: 'Super',
        lastName: 'Admin',
        mobile: bootstrapMobile,
        email: 'superadmin@example.com',
        joinedAt: new Date(),
      },
    });
    // Advance the shared sequence so the next employee created through the API
    // (NumberGeneratorService) doesn't collide with this hand-assigned code —
    // that collision is exactly what happened the first time this seed ran.
    await prisma.numberSequence.upsert({
      where: { entityType_scopeKey: { entityType: 'EMPLOYEE', scopeKey: branch.code } },
      update: { lastValue: 1 },
      create: { entityType: 'EMPLOYEE', scopeKey: branch.code, lastValue: 1 },
    });
    console.log(`Bootstrap SUPER_ADMIN created — mobile: ${bootstrapMobile}, password: ${bootstrapPassword}`);
    console.log('CHANGE THIS PASSWORD IMMEDIATELY via /auth/employee/login then /employees/:id/reset-access.');
  } else {
    console.log('Bootstrap SUPER_ADMIN already exists, skipping.');
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
