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

  // Phase B — core loan lifecycle
  { code: 'loan_product.view', resource: 'loan_product', action: 'view', description: 'View loan products' },
  { code: 'loan_product.manage', resource: 'loan_product', action: 'manage', description: 'Create/update loan products, interest rules & charges' },
  { code: 'loan_application.view', resource: 'loan_application', action: 'view', description: 'View loan applications' },
  { code: 'loan_application.create', resource: 'loan_application', action: 'create', description: 'Create a loan application on behalf of a customer' },
  { code: 'loan_application.cancel', resource: 'loan_application', action: 'cancel', description: 'Cancel a loan application' },
  { code: 'appraisal.view', resource: 'appraisal', action: 'view', description: 'View gold appraisals' },
  { code: 'appraisal.create', resource: 'appraisal', action: 'create', description: 'Record a gold appraisal' },
  { code: 'appraisal.approve', resource: 'appraisal', action: 'approve', description: 'Check/approve a gold appraisal (maker-checker)' },
  { code: 'loan.view', resource: 'loan', action: 'view', description: 'View loans' },
  { code: 'loan.approve', resource: 'loan', action: 'approve', description: 'Approve or reject a loan (maker-checker, amount-tiered)' },
  { code: 'loan.disburse', resource: 'loan', action: 'disburse', description: 'Disburse an approved loan' },
  { code: 'loan.close', resource: 'loan', action: 'close', description: 'Settle and close a loan' },
  { code: 'loan.renew', resource: 'loan', action: 'renew', description: 'Settle accrued interest/charges and roll a loan into a fresh term' },
  { code: 'loan.topup', resource: 'loan', action: 'topup', description: 'Re-value pledged gold at today\'s rate and disburse the extra eligible credit' },
  { code: 'loan.partrelease', resource: 'loan', action: 'partrelease', description: 'Hand back selected pledged items while the loan stays open, if the rest still covers the principal' },
  { code: 'payment.view', resource: 'payment', action: 'view', description: 'View payments & receipts' },
  { code: 'payment.create', resource: 'payment', action: 'create', description: 'Record a payment against a loan' },

  { code: 'collection.view', resource: 'collection', action: 'view', description: 'View overdue collection cases' },
  { code: 'collection.manage', resource: 'collection', action: 'manage', description: 'Log contact attempts and record promises to pay on a collection case' },
  { code: 'collection.assign', resource: 'collection', action: 'assign', description: 'Assign collection cases to officers and run the overdue sweep' },

  { code: 'enquiry.view', resource: 'enquiry', action: 'view', description: 'View enquiries submitted from the public website' },
  { code: 'enquiry.manage', resource: 'enquiry', action: 'manage', description: 'Update the status of a website enquiry' },

  { code: 'report.view', resource: 'report', action: 'view', description: 'View portfolio, overdue-aging, branch and collections reports, and export them as CSV' },

  { code: 'auction.view', resource: 'auction', action: 'view', description: 'View auction candidates and auctions' },
  { code: 'auction.manage', resource: 'auction', action: 'manage', description: 'Put an overdue loan forward for auction, set the reserve price, send notice, schedule or cancel an auction' },
  { code: 'auction.approve', resource: 'auction', action: 'approve', description: 'Approve an auction once the notice period is over (must be someone other than the person who prepared it)' },
  { code: 'auction.settle', resource: 'auction', action: 'settle', description: 'Record the auction sale and pay any surplus back to the borrower (two different people)' },
  { code: 'auction.writeoff', resource: 'auction', action: 'writeoff', description: 'Write off what an auction sale left unpaid (someone other than the person who recorded the sale)' },

  { code: 'vault.view', resource: 'vault', action: 'view', description: 'View vaults, storage locations and packets' },
  { code: 'vault.manage', resource: 'vault', action: 'manage', description: 'Set up vaults and locations, seal collateral into a packet, store, move, audit and release it' },

  { code: 'ticket.view', resource: 'ticket', action: 'view', description: 'View support tickets' },
  { code: 'ticket.manage', resource: 'ticket', action: 'manage', description: 'Raise a ticket on a customer\'s behalf, assign, work and resolve support tickets' },

  { code: 'risk.view', resource: 'risk', action: 'view', description: 'View risk alerts raised on customers, loans, employees or collateral' },
  { code: 'risk.manage', resource: 'risk', action: 'manage', description: 'Run the risk rule scan and review, escalate or dismiss a risk alert' },

  { code: 'cash.view', resource: 'cash', action: 'view', description: 'View a branch\'s daily cash register and its history' },
  { code: 'cash.manage', resource: 'cash', action: 'manage', description: 'Open and close a branch\'s cash register and record cash receipts, disbursements and transfers' },

  { code: 'reconciliation.view', resource: 'reconciliation', action: 'view', description: 'View imported bank statement lines and what they have been matched to' },
  { code: 'reconciliation.manage', resource: 'reconciliation', action: 'manage', description: 'Import bank statement lines, run auto-match, and manually match or unmatch a bank line' },
];

// STARTING suggestions only — never enforced defaults. They are applied once: to a role the first time it
// is created, and to a permission the first time it is introduced. After that, what each role may do is
// whatever an admin has set in Roles & Permissions, and re-running this seed never overwrites it.
// SUPER_ADMIN is the one exception: it is locked to full access (see modules/rbac/access-rules.ts).
const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: PERMISSIONS.map((p) => p.code),
  ADMIN: [
    'branch.view', 'branch.manage', 'employee.view', 'employee.manage',
    'customer.view', 'customer.kyc.verify', 'role.view', 'setting.view',
    'setting.manage', 'audit_log.view',
    'loan_product.view', 'loan_product.manage', 'loan_application.view',
    'appraisal.view', 'loan.view', 'loan.approve', 'loan.disburse', 'loan.close', 'loan.renew', 'loan.topup', 'loan.partrelease', 'payment.view',
    'collection.view', 'collection.manage', 'collection.assign',
    'enquiry.view', 'enquiry.manage',
    'report.view',
    'auction.view', 'auction.manage',
    'risk.view', 'risk.manage',
    'cash.view', 'cash.manage', 'reconciliation.view', 'reconciliation.manage',
  ],
  REGIONAL_MANAGER: [
    'branch.view', 'employee.view', 'customer.view', 'setting.view', 'setting.approve', 'audit_log.view',
    'loan_product.view', 'loan_application.view', 'appraisal.view', 'loan.view', 'loan.approve', 'loan.renew', 'loan.topup', 'loan.partrelease', 'payment.view',
    'collection.view', 'collection.manage', 'collection.assign',
    'enquiry.view', 'enquiry.manage',
    'report.view',
    'auction.view', 'auction.approve',
    'vault.view',
    'risk.view',
    'cash.view',
  ],
  BRANCH_MANAGER: [
    'branch.view', 'employee.view', 'customer.view', 'customer.kyc.verify',
    'loan_product.view', 'loan_application.view', 'appraisal.view', 'appraisal.approve',
    'loan.view', 'loan.approve', 'loan.disburse', 'loan.close', 'loan.renew', 'loan.topup', 'loan.partrelease', 'payment.view',
    'collection.view', 'collection.manage', 'collection.assign',
    'enquiry.view', 'enquiry.manage',
    'report.view',
    'auction.view',
    'vault.view',
    'cash.view',
  ],
  LOAN_OFFICER: ['customer.view', 'loan_product.view', 'loan_application.view', 'loan_application.create', 'loan_application.cancel', 'loan.view'],
  APPRAISER: ['customer.view', 'loan_application.view', 'appraisal.view', 'appraisal.create', 'loan.view'],
  CASHIER: ['customer.view', 'loan.view', 'payment.view', 'payment.create', 'cash.view', 'cash.manage'],
  COLLECTION_OFFICER: ['customer.view', 'loan.view', 'collection.view', 'collection.manage'],
  AUDITOR: [
    'branch.view', 'employee.view', 'customer.view', 'audit_log.view', 'setting.view',
    'loan_product.view', 'loan_application.view', 'appraisal.view', 'loan.view', 'payment.view', 'collection.view', 'report.view',
    'auction.view', 'vault.view', 'ticket.view', 'risk.view', 'cash.view', 'reconciliation.view',
  ],
  CUSTOMER_SUPPORT: ['customer.view', 'loan_application.view', 'loan.view', 'enquiry.view', 'enquiry.manage', 'ticket.view', 'ticket.manage'],
  REPORTING_USER: ['branch.view', 'audit_log.view', 'report.view'],
  // New roles for later phases (compliance, legal, integrations) start with zero permissions —
  // same least-privilege pattern as every existing role. Each gets granted its own codes when
  // its module ships. Vault, auction, risk and finance have already shipped.
  LEGAL_OFFICER: [],
  COMPLIANCE_OFFICER: ['risk.view'],
  RISK_OFFICER: ['loan.view', 'customer.view', 'risk.view', 'risk.manage'],
  FINANCE_MANAGER: ['loan.view', 'payment.view', 'audit_log.view', 'report.view', 'auction.view', 'auction.settle', 'auction.writeoff', 'cash.view', 'reconciliation.view', 'reconciliation.manage'],
  VAULT_MANAGER: ['customer.view', 'loan.view', 'vault.view', 'vault.manage'],
  AUCTION_MANAGER: ['loan.view', 'collection.view', 'auction.view', 'auction.manage', 'auction.settle'],
  SYSTEM_INTEGRATOR: [],
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
  LEGAL_OFFICER: 'Legal Officer',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  RISK_OFFICER: 'Risk Officer',
  FINANCE_MANAGER: 'Finance Manager',
  VAULT_MANAGER: 'Vault Manager',
  AUCTION_MANAGER: 'Auction Manager',
  SYSTEM_INTEGRATOR: 'System Integrator',
};

async function main() {
  console.log('Seeding permissions...');
  const existingPermissionCodes = new Set((await prisma.permission.findMany({ select: { code: true } })).map((p) => p.code));
  const newPermissionCodes = new Set<string>();
  for (const p of PERMISSIONS) {
    if (existingPermissionCodes.has(p.code)) continue;
    await prisma.permission.create({ data: p });
    newPermissionCodes.add(p.code);
  }

  console.log('Seeding roles...');
  const newRoleCodes = new Set<string>();
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    if (await prisma.role.findUnique({ where: { code } })) continue;
    await prisma.role.create({ data: { code, name, isSystem: true } });
    newRoleCodes.add(code);
  }

  // Suggested starting access, applied only where nothing has been decided yet: every permission of a
  // brand-new role, and a brand-new permission's suggested holders. Anything an admin has since switched
  // on or off for an existing role is left exactly as they set it.
  console.log('Applying starting access to new roles / new permissions only...');
  for (const [roleCode, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    const codes = newRoleCodes.has(roleCode) ? permissionCodes : permissionCodes.filter((c) => newPermissionCodes.has(c));
    if (codes.length === 0) continue;
    const permissions = await prisma.permission.findMany({ where: { code: { in: codes } } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }

  // Super Admin always holds every permission (its access cannot be edited), so it never falls behind
  // when a new permission is introduced.
  const superAdmin = await prisma.role.findUniqueOrThrow({ where: { code: 'SUPER_ADMIN' } });
  const everyPermission = await prisma.permission.findMany({ select: { id: true } });
  await prisma.rolePermission.createMany({
    data: everyPermission.map((p) => ({ roleId: superAdmin.id, permissionId: p.id })),
    skipDuplicates: true,
  });

  // Auction parameters live in Configuration so they can be changed through the normal maker-checker flow.
  // Created only if missing, and never overwritten. THESE ARE PLACEHOLDERS: the real minimum overdue period,
  // notice period and reserve-price percentage must come from the lender's compliance sign-off.
  console.log('Seeding auction parameters (placeholders)...');
  const AUCTION_SETTINGS: { key: string; value: number | string; dataType: string; description: string }[] = [
    { key: 'AUCTION_MIN_OVERDUE_DAYS', dataType: 'NUMBER', value: 30, description: 'Days a loan must be past due (after grace) before it can be put up for auction. PLACEHOLDER — set per compliance sign-off.' },
    { key: 'AUCTION_NOTICE_PERIOD_DAYS', dataType: 'NUMBER', value: 15, description: 'Days between sending the auction notice and the earliest approval of the auction. PLACEHOLDER — set per compliance sign-off.' },
    { key: 'AUCTION_RESERVE_PRICE_PERCENT', dataType: 'NUMBER', value: 85, description: 'Reserve price as a percentage of the current market value of the pledged gold. PLACEHOLDER — set per compliance sign-off.' },
    {
      key: 'AUCTION_NOTICE_LEGAL_TEXT',
      dataType: 'STRING',
      value:
        'This notice is issued because the loan above has not been repaid by its due date. If the amount due is not paid within the notice period, the pledged gold may be sold at auction in accordance with your loan agreement and applicable law, and the sale money applied to what you owe. Any amount left over after your loan has been cleared will be paid back to you. If you believe this notice is wrong, or you need more time, please contact your branch straight away.',
      description: 'The wording printed at the foot of the borrower auction notice. PLACEHOLDER — must be replaced with text approved by the lender legal/compliance team.',
    },
  ];
  for (const st of AUCTION_SETTINGS) {
    const exists = await prisma.setting.findFirst({ where: { key: st.key, scope: 'GLOBAL' } });
    if (!exists) {
      await prisma.setting.create({ data: { key: st.key, scope: 'GLOBAL', value: st.value, dataType: st.dataType, description: st.description, status: 'ACTIVE' } });
    }
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

  const branchFields = {
    name: 'Goldnest Head Office Branch',
    addressLine1: 'MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    pinCode: '560001',
    phone: '080-0000-0000',
    latitude: 12.9757,
    longitude: 77.6079,
    workingHours: { text: 'Mon–Sat, 9:30 AM – 6:30 PM' },
  };
  const branch = await prisma.branch.upsert({
    where: { code: 'HO01' },
    update: branchFields,
    create: { organizationId: org.id, code: 'HO01', ...branchFields },
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

  // One demo login per role, for stakeholder walkthroughs and local testing — NOT real staff.
  // Skippable with SEED_DEMO_EMPLOYEES=false (e.g. before seeding a real production database).
  if (process.env.SEED_DEMO_EMPLOYEES !== 'false') {
    console.log('Seeding demo employee logins (one per role)...');
    const demoPassword = 'Demo@Goldnest2026';
    const demoPasswordHash = await bcrypt.hash(demoPassword, 12);
    const DEMO_EMPLOYEES: { mobile: string; roleCode: string; firstName: string; lastName: string }[] = [
      { mobile: '9800000001', roleCode: 'ADMIN', firstName: 'Demo', lastName: 'Admin' },
      { mobile: '9800000002', roleCode: 'REGIONAL_MANAGER', firstName: 'Demo', lastName: 'Regional Manager' },
      { mobile: '9800000003', roleCode: 'BRANCH_MANAGER', firstName: 'Demo', lastName: 'Branch Manager' },
      { mobile: '9800000004', roleCode: 'LOAN_OFFICER', firstName: 'Demo', lastName: 'Loan Officer' },
      { mobile: '9800000005', roleCode: 'APPRAISER', firstName: 'Demo', lastName: 'Appraiser' },
      { mobile: '9800000006', roleCode: 'CASHIER', firstName: 'Demo', lastName: 'Cashier' },
      { mobile: '9800000007', roleCode: 'COLLECTION_OFFICER', firstName: 'Demo', lastName: 'Collection Officer' },
      { mobile: '9800000008', roleCode: 'AUDITOR', firstName: 'Demo', lastName: 'Auditor' },
      { mobile: '9800000009', roleCode: 'CUSTOMER_SUPPORT', firstName: 'Demo', lastName: 'Customer Support' },
      { mobile: '9800000010', roleCode: 'REPORTING_USER', firstName: 'Demo', lastName: 'Reporting User' },
    ];
    const seq = await prisma.numberSequence.findUnique({ where: { entityType_scopeKey: { entityType: 'EMPLOYEE', scopeKey: branch.code } } });
    let nextSeq = (seq?.lastValue ?? 1) + 1;
    for (const d of DEMO_EMPLOYEES) {
      if (await prisma.user.findUnique({ where: { mobile: d.mobile } })) continue;
      const role = await prisma.role.findUniqueOrThrow({ where: { code: d.roleCode } });
      const user = await prisma.user.create({ data: { type: 'EMPLOYEE', mobile: d.mobile, passwordHash: demoPasswordHash } });
      await prisma.employee.create({
        data: {
          userId: user.id,
          employeeCode: `EMP-${branch.code}-${String(nextSeq).padStart(6, '0')}`,
          branchId: branch.id,
          roleId: role.id,
          firstName: d.firstName,
          lastName: d.lastName,
          mobile: d.mobile,
          joinedAt: new Date(),
        },
      });
      nextSeq++;
    }
    await prisma.numberSequence.upsert({
      where: { entityType_scopeKey: { entityType: 'EMPLOYEE', scopeKey: branch.code } },
      update: { lastValue: nextSeq - 1 },
      create: { entityType: 'EMPLOYEE', scopeKey: branch.code, lastValue: nextSeq - 1 },
    });
    console.log(`Demo employees ready — mobiles 9800000001-9800000010, password: ${demoPassword}`);
  }

  console.log('Seeding Gold Loan Standard product...');
  // Placeholder-but-realistic commercial terms, NOT the real lender's approved
  // policy. Interest rate, LTV, tenure and charges below must be reviewed and
  // signed off by the actual lending entity's legal/compliance function
  // before this product is used for a real disbursement (spec section 3).
  let product = await prisma.loanProduct.findUnique({ where: { code: 'GL-STD' } });
  if (!product) {
    product = await prisma.loanProduct.create({
      data: {
        code: 'GL-STD',
        name: 'Gold Loan Standard',
        type: 'GOLD_LOAN',
        maxLtvPercent: 75,
        minLoanAmount: 5000,
        maxLoanAmount: 2000000,
        minTenureDays: 30,
        maxTenureDays: 365,
        gracePeriodDays: 3,
      },
    });
    await prisma.interestRule.create({
      data: {
        productId: product.id,
        method: 'REDUCING_BALANCE',
        annualRatePercent: 12,
        accrualFrequency: 'DAILY',
        paymentFrequency: 'MONTHLY',
        penalRatePercent: 2,
        effectiveFrom: new Date(),
      },
    });
    await prisma.charge.createMany({
      data: [
        { productId: product.id, code: 'PROCESSING_FEE', name: 'Processing Fee', calcType: 'PERCENT_OF_PRINCIPAL', amount: 1 },
        { productId: product.id, code: 'VALUATION_FEE', name: 'Gold Valuation Fee', calcType: 'FLAT', amount: 250 },
      ],
    });
    await prisma.branchProduct.upsert({
      where: { branchId_productId: { branchId: branch.id, productId: product.id } },
      update: {},
      create: { branchId: branch.id, productId: product.id },
    });
    console.log('Gold Loan Standard seeded: 12% p.a. reducing balance, up to 75% LTV — PLACEHOLDER TERMS.');
  } else {
    console.log('Gold Loan Standard already exists, skipping.');
  }

  console.log('Seeding the head office vault...');
  let vault = await prisma.vault.findFirst({ where: { branchId: branch.id, name: 'Head Office Strongroom' } });
  if (!vault) {
    vault = await prisma.vault.create({ data: { branchId: branch.id, name: 'Head Office Strongroom' } });
    const locker1 = await prisma.vaultLocation.create({ data: { vaultId: vault.id, type: 'LOCKER', code: 'L-01' } });
    await prisma.vaultLocation.create({ data: { vaultId: vault.id, type: 'LOCKER', code: 'L-02' } });
    await prisma.vaultLocation.createMany({
      data: [
        { vaultId: vault.id, type: 'SHELF', code: 'S-01', parentId: locker1.id },
        { vaultId: vault.id, type: 'SHELF', code: 'S-02', parentId: locker1.id },
      ],
    });
    console.log('Vault seeded: Head Office Strongroom, 2 lockers (one with 2 shelves).');
  } else {
    console.log('Head office vault already exists, skipping.');
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
